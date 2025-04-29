import React, { useState } from 'react';
import axios from 'axios';

function UploadForm() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file first.');
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const uploadResponse = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      console.log('Upload success:', uploadResponse.data);
  
      // Now immediately call the extract endpoint
      const filename = uploadResponse.data.filename;
  
      const extractResponse = await axios.post('http://localhost:5000/extract', {
        filename: filename,
      });
  
      console.log('Extracted Data:', extractResponse.data);
      setUploadStatus('✅ File uploaded and extracted successfully! Check console for data.');
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('❌ Upload or extraction failed.');
    }
  };  

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '10px', marginTop: '1rem' }}>
      <h2>Upload a Purchase Order PDF</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload}>Upload</button>
      <p>{uploadStatus}</p>
    </div>
  );
}

export default UploadForm;
