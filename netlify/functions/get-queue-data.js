exports.handler = async (event, context) => {
  try {
    // อ่าน parameter dept จาก query string
    const dept = event.queryStringParameters?.dept || '1';
    
    // ดึง URL จาก Environment Variable
    const sheetsUrl = process.env.GOOGLE_SHEETS_URL;
    
    if (!sheetsUrl) {
      throw new Error('GOOGLE_SHEETS_URL environment variable not configured');
    }
    
    console.log('Fetching data for department:', dept);
    console.log('Using sheets URL:', sheetsUrl);
    
    // ดึงข้อมูลจาก Google Sheets
    const response = await fetch(sheetsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('Raw CSV data:', csvText);
    
    // แปลง CSV เป็น array
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    const data = rows.map(row => {
      const cols = row.split(',').map(col => col.trim().replace(/"/g, ''));
      return cols;
    });
    
    console.log('Parsed data:', data);
    
    // คำนวณ index แถวที่ต้องการ
    // dept=1 -> แถวที่ 4 (index 3)
    // dept=2 -> แถวที่ 5 (index 4) 
    // dept=4 -> แถวที่ 7 (index 6)
    const rowIndex = parseInt(dept) + 2;
    
    console.log('Target row index:', rowIndex, 'for dept:', dept);
    
    // ตรวจสอบว่าแถวนั้นมีข้อมูลไหม
    let deptData = null;
    if (rowIndex < data.length && data[rowIndex]) {
      deptData = data[rowIndex];
    } else {
      // ถ้าไม่เจอ ใช้แถวแรกที่มีข้อมูล (แถว 4)
      if (data.length > 3) {
        deptData = data[3];
        console.log('Row not found, using first data row');
      }
    }
    
    if (!deptData) {
      throw new Error('No data found in spreadsheet');
    }
    
    // จัดรูปแบบข้อมูล
    const queueData = {
      department: deptData[0] || `แผนก ${dept}`,      // คอลัมน์ A
      currentQueue: deptData[1] || 'A001',            // คอลัมน์ B - คิวล่าสุด
      nextQueue: deptData[2] || 'A002',               // คอลัมน์ C - คิวถัดไป
      waitingQueue: parseInt(deptData[3]) || 0,       // คอลัมน์ D - คิวรออยู่
      lastUpdate: deptData[4] || new Date().toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })                                              // คอลัมน์ E - เวลาล่าสุด
    };
    
    console.log('Final queue data:', queueData);
    
    // ส่งข้อมูลกลับ
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // สำหรับ CORS
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify(queueData)
    };
    
  } catch (error) {
    console.error('Error in get-queue-data function:', error);
    
    // ส่งข้อมูล fallback ในกรณี error
    const dept = event.queryStringParameters?.dept || '1';
    
    return {
      statusCode: 200, // ใช้ 200 แทน 500 เพื่อให้ frontend ทำงานต่อได้
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        department: `แผนก ${dept}`,
        currentQueue: 'A001',
        nextQueue: 'A002',
        waitingQueue: 0,
        lastUpdate: 'ไม่สามารถเชื่อมต่อได้',
        error: error.message
      })
    };
  }
};
