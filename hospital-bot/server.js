const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(cors());
app.use(express.json());

// 🌟 पोर्ट को डायनामिक बनाया (Render के लिए अनिवार्य)
const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// 📁 स्टैटिक फोल्डर्स कॉन्फ़िगरेशन
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🌟 क्रिटिकल फीचर: फ्रंटएंड के प्रोडक्शन 'dist' फोल्डर को बैकएंड के साथ लिंक करना
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, { index: 'index.html' }));

// Root fallback (Express 'cannot GET /' fix in packaged mode)
app.get('/', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    // If index.html not found, return a clear debug message
    return res.status(404).send(`index.html not found. Expected: ${indexPath}`);
});

if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

// Global Virtual Data Storage
let dbData = {
    keywords: [
        { key: '1', purpose: 'OPD डॉक्टर ड्यूटी रोस्टर शेड्यूल', reply: '🏥 *वरुण अर्जुन हॉस्पिटल OPD डिपार्टमेंट्स:* \n\nकृपया जिस विभाग का रोस्टर देखना चाहते हैं, उसका *नंबर लिखकर रिप्लाई करें:*' },
        { key: '2', purpose: 'आयुष्मान भारत काउंटर सुविधा', reply: 'कमरा नंबर 12 (Ground Floor) पर आयुष्मान भारत योजना सहायता केंद्र एक्टिव है।' },
        { key: '3', purpose: 'इमरजेंसी वार्ड एवं एम्बुलेंस', reply: 'इमरजेंसी वार्ड 24x7 चालू है। एम्बुलेंस इमरजेंसी नंबर: 05842-XXXXXX' }
    ],
    roster: [
        { dept: 'General Medicine', doctor: 'Dr. R.K. Sharma', time: '09:00 AM - 02:00 PM' },
        { dept: 'Orthopedics', doctor: 'Dr. Amit Verma', time: '10:00 AM - 04:00 PM' }
    ],
    pdfs: []
};

let sock = null;
let botStatus = 'Disconnected';
let generatedQr = '';
let connectedPhone = ''; 
let connectedName = ''; 
let connectedPic = '';  
let botErrorReason = ''; 

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deleteAuthFolder = () => {
    try {
        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            console.log('[SYSTEM] Auth folder deleted automatically.');
        }
    } catch (e) {
        console.log('[Folder Delete Error]:', e.message);
    }
};

app.get('/api/status', (req, res) => {
    res.json({ 
        success: true, 
        status: botStatus, 
        qr: generatedQr, 
        connectedPhone,
        connectedName,
        connectedPic,
        errorReason: botErrorReason 
    });
});

app.get('/api/config', (req, res) => res.json({ success: true, ...dbData }));

// कोर फंक्शन: व्हाट्सएप कनेक्शन लूप
async function startWhatsApp() {
    if (sock) {
        try { sock.ev.removeAllListeners(); } catch (e) {}
        try { sock.end && sock.end(); } catch (e) {}
        sock = null;
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: false,
            defaultQueryTimeoutMs: undefined,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            retryRequestDelayMs: 5000
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr) { 
                botStatus = 'QR_Ready'; 
                generatedQr = qr; 
                botErrorReason = '';
            }
            
            if (connection === 'open') { 
                botStatus = 'Connected'; 
                generatedQr = ''; 
                botErrorReason = '';
                
                const userJid = sock.user && (sock.user.id || sock.user.jid);
                if (userJid) {
                    connectedPhone = userJid.split(':')[0].split('@')[0];
                    connectedName = sock.user.name || 'VAMC Admin';
                    try {
                        connectedPic = await sock.profilePictureUrl(userJid, 'image').catch(() => '');
                    } catch (pErr) { connectedPic = ''; }
                }
                await saveCreds(); 
                console.log('[SYSTEM] Account add successfully! Number:', connectedPhone);
            }
            
            if (connection === 'close') {
                generatedQr = '';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('[BAILEYS] Connection closed. Status Code:', statusCode);
                
                const shouldRestart = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
                
                if (shouldRestart) {
                    botStatus = 'Connecting...';
                    botErrorReason = 'Re-establishing stream connection... Please wait.';
                    console.log('[BAILEYS] Stream restart required. Re-initializing loop seamlessly...');
                    setTimeout(() => { startWhatsApp(); }, 3000);
                } else {
                    botStatus = 'Disconnected';
                    connectedPhone = '';
                    connectedName = '';
                    connectedPic = '';
                    botErrorReason = "Couldn't log in. Check your phone's internet connection and scan the QR code again.";
                    sock = null;
                    deleteAuthFolder(); 
                }
            }
        });

        // Smart Patient Handler Engine
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const remoteJid = msg.key.remoteJid;
            const incomingText = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
            const departmentsList = Array.from(new Set(dbData.roster.map(d => d.dept)));
            const matchedKeyword = dbData.keywords.find(k => k.key.toLowerCase() === incomingText);

            if (matchedKeyword) {
                let replyText = matchedKeyword.reply;
                if (incomingText === '1') {
                    departmentsList.forEach((dept, i) => { replyText += `\n1${i+1}️⃣ *${dept}*`; });
                    replyText += `\n\n_💡 केवल विभाग का नंबर (जैसे 11) लिखकर भेजें।_`;
                }
                await sock.sendMessage(remoteJid, { text: replyText });
                return;
            }

            if (incomingText.startsWith('1') && incomingText.length > 1) {
                const indexSelected = parseInt(incomingText.substring(1)) - 1;
                if (indexSelected >= 0 && indexSelected < departmentsList.length) {
                    const targetDept = departmentsList[indexSelected];
                    const activeDocs = dbData.roster.filter(d => d.dept === targetDept);
                    let docReply = `🏥 *वरुण अर्जुन अस्पताल — ${targetDept} विभाग रोस्टर:* \n`;
                    if (activeDocs.length > 0) {
                        activeDocs.forEach(d => { docReply += `\n👨‍⚕️ *${d.doctor}* \n🕒 समय: ${d.time}\n`; });
                    } else {
                        docReply += `\nइस समय इस विभाग में कोई डॉक्टर ड्यूटी पर शेड्यूल नहीं है।`;
                    }
                    await sock.sendMessage(remoteJid, { text: docReply });
                    return;
                }
            }

            let mainMenu = `🏥 *Varun Arjun Medical College & Rohilkhand Hospital* डिजिटल हेल्प डेस्क में आपका स्वागत है। 🙏\n\nजानकारी प्राप्त करने के लिए कृपया सूची में से किसी एक **नंबर** को लिखकर रिप्लाई करें:\n\n`;
            dbData.keywords.sort((a,b) => a.key.localeCompare(b.key)).forEach(item => { mainMenu += `${item.key}️⃣ *${item.purpose}*\n`; });
            mainMenu += `\n_💡 केवल संख्या (जैसे 1 या 2) टाइप करके मैसेज सेंड करें।_`;
            await sock.sendMessage(remoteJid, { text: mainMenu });
        });

    } catch (err) {
        botStatus = 'Disconnected';
        botErrorReason = "Initialization failed. Try again.";
        deleteAuthFolder();
    }
}

// WhatsApp Connection API Trigger
app.post('/api/connect', async (req, res) => {
    botStatus = 'Connecting...';
    generatedQr = '';
    connectedPhone = '';
    connectedName = '';
    connectedPic = '';
    botErrorReason = ''; 
    res.json({ success: true });
    startWhatsApp();
});

app.post('/api/logout', async (req, res) => {
    try {
        botStatus = 'Disconnected';
        generatedQr = '';
        connectedPhone = '';
        connectedName = '';
        connectedPic = '';
        botErrorReason = '';
        if (sock) {
            try { sock.ev.removeAllListeners(); } catch (e) {}
            try { await sock.logout(); } catch (e) {}
            try { sock.end && sock.end(); } catch (e) {}
        }
        sock = null;
        deleteAuthFolder(); 
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// Admin Control Configurations
app.post('/api/config/keyword', (req, res) => {
    const { key, purpose, reply } = req.body;
    dbData.keywords = dbData.keywords.filter(k => k.key !== key);
    dbData.keywords.push({ key, purpose, reply });
    res.json({ success: true, keywords: dbData.keywords });
});
app.delete('/api/config/keyword/:keyNum', (req, res) => {
    dbData.keywords = dbData.keywords.filter(k => k.key !== req.params.keyNum);
    res.json({ success: true, keywords: dbData.keywords });
});
app.post('/api/config/roster', (req, res) => {
    const { dept, doctor, time } = req.body;
    dbData.roster.push({ dept, doctor, time });
    res.json({ success: true, roster: dbData.roster });
});
app.delete('/api/config/roster/:index', (req, res) => {
    const idx = parseInt(req.params.index);
    dbData.roster = dbData.roster.filter((_, i) => i !== idx);
    res.json({ success: true, roster: dbData.roster });
});

// 🌟 संशोधित PDF API: localhost हटाकर लाइव डोमेन यूआरएल को डायनामिक किया
app.post('/api/config/pdf', upload.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    const { keyNum, title } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // वर्तमान रिक्वेस्ट हेडर से डोमेन (जैसे: whatsbot-2uw3.onrender.com) उठाएं
    const host = req.get('host'); 
    const protocol = req.protocol; 
    const fullLiveUrl = `${protocol}://${host}${fileUrl}`;
    
    dbData.pdfs = dbData.pdfs.filter(p => p.keyNum !== keyNum);
    dbData.pdfs.push({ keyNum, title, url: fileUrl });
    dbData.keywords = dbData.keywords.filter(k => k.key !== keyNum);
    dbData.keywords.push({ key: keyNum, purpose: `PDF: ${title}`, reply: `📄 *साप्ताहिक ड्यूटी शेड्यूल लिंक:* \n${fullLiveUrl}` });
    res.json({ success: true, pdfs: dbData.pdfs, keywords: dbData.keywords });
});

app.delete('/api/config/pdf/:keyNum', (req, res) => {
    const { keyNum } = req.params;
    dbData.pdfs = dbData.pdfs.filter(p => p.keyNum !== keyNum);
    dbData.keywords = dbData.keywords.filter(k => k.key !== keyNum);
    res.json({ success: true, pdfs: dbData.pdfs, keywords: dbData.keywords });
});
app.post('/api/admin-reply', async (req, res) => {
    const { number, message } = req.body;
    if(!sock || botStatus !== 'Connected') return res.status(400).json({ success: false });
    try {
        await sock.sendMessage(`${number.replace('+', '')}@s.whatsapp.net`, { text: `💬 *अस्पताल एडमिन डेस्क:* \n${message}` });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/broadcast-excel', async (req, res) => {
    const { numbers, message } = req.body;
    if(!sock || botStatus !== 'Connected') return res.status(400).json({ success: false });
    res.json({ success: true, message: "बल्क सेंडिंग बैकग्राउंड में चालू।" });
    for (let i = 0; i < numbers.length; i++) {
        try {
            let num = numbers[i].toString().replace(/\D/g, '');
            if (!num.startsWith('91')) num = '91' + num;
            await sock.sendMessage(`${num}@s.whatsapp.net`, { text: message });
            if (i < numbers.length - 1) await delay(Math.floor(Math.random() * 10000) + 15000);
        } catch (e) {}
    }
});

// 🌟 सर्वर को पर्यावरण (Environment) या डिफ़ॉल्ट पोर्ट पर शुरू करें
app.listen(PORT, () => console.log(`🚀 बैकएंड सर्वर पोर्ट ${PORT} पर शानदार चल रहा है।`));