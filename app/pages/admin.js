import { useState } from 'react';
import QRCode from 'qrcode.react';

export default function Admin() {
  const [doorId, setDoorId] = useState('');

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Smart Doorbell Admin</h1>
      <input 
        type="text" 
        placeholder="Door ID (e.g., room-101)" 
        onChange={(e) => setDoorId(e.target.value)}
        style={{ padding: '10px', width: '250px' }}
      />
      {doorId && (
        <div style={{ marginTop: '30px' }}>
          <QRCode value={`http://localhost:3000/call/${doorId}`} size={256} />
          <p>අලවන්නට QR එක බාගත කරගන්න</p>
        </div>
      )}
    </div>
  );
}