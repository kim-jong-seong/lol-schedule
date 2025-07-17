const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

console.log('🚀 서버 시작 중...');

const app = express();
const server = http.createServer(app);
const PORT = 7000;
const DATA_FILE = 'schedule-data.json';

// Socket.IO 로드
console.log('📦 Socket.IO 로드 시도 중...');
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
console.log('✅ Socket.IO 로드 성공!');

// 미들웨어
app.use(express.json());
app.use(express.static('.'));

// 요청 로그
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 초기 데이터 생성
function createInitialData() {
    const members = ['김지훈', '김승진', '이성규', '조영인', '김종성'];
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const hours = Array.from({length: 24}, (_, i) => i + 1);
    
    const scheduleData = {};
    members.forEach(member => {
        scheduleData[member] = {};
        days.forEach(day => {
            scheduleData[member][day] = {};
            hours.forEach(hour => {
                scheduleData[member][day][hour] = false;
            });
        });
    });
    
    return scheduleData;
}

// 파일 초기화
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
        console.log('✅ schedule-data.json 파일이 존재합니다.');
    } catch (error) {
        console.log('📝 schedule-data.json 파일을 새로 생성합니다.');
        const initialData = createInitialData();
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ schedule-data.json 파일이 생성되었습니다.');
    }
}

// API: 데이터 로드
app.get('/api/schedule', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('❌ 데이터 읽기 실패:', error);
        res.status(500).json({ error: '데이터 읽기 실패' });
    }
});

// API: 데이터 저장
app.post('/api/schedule', async (req, res) => {
    try {
        const scheduleData = req.body;
        await fs.writeFile(DATA_FILE, JSON.stringify(scheduleData, null, 2));
        console.log('💾 스케줄 데이터가 저장되었습니다.');
        
        // 모든 클라이언트에게 실시간 전송
        io.emit('scheduleUpdated', scheduleData);
        console.log('📡 실시간 업데이트 전송됨');
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ 데이터 저장 실패:', error);
        res.status(500).json({ error: '데이터 저장 실패' });
    }
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('🔗 새로운 클라이언트가 연결되었습니다:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('❌ 클라이언트가 연결을 해제했습니다:', socket.id);
    });
});

// 루트 경로
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
server.listen(PORT, async () => {
    await initializeDataFile();
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log('⚡ 실시간 동기화가 활성화되었습니다.');
});