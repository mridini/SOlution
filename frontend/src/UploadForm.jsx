import React, { useState } from 'react';
import axios from 'axios';

function UploadForm() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [matches, setMatches] = useState({});
  const [selectedMatches, setSelectedMatches] = useState({});
  const [isMatching, setIsMatching] = useState(false);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus('');
    setExtractedItems([]);
    setMatches({});
    setSelectedMatches({});
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('❗ Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 1: Upload file to Flask
      const uploadResponse = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const filename = uploadResponse.data.filename;
      console.log('✅ Upload success:', filename);

      // Step 2: Extract items from file
      const extractResponse = await axios.post('http://localhost:5000/extract', {
        filename: filename,
      });

      const items = extractResponse.data;
      setExtractedItems(items);
      setUploadStatus('✅ File uploaded and extracted successfully!');
      console.log('✅ Extraction result:', items);

      // Step 3: Match items using local fuzzy match
      const itemNames = items.map(item => item['Request Item']);
      
      setIsMatching(true);
      const matchResponse = await axios.post('http://localhost:5000/local_match', {
        items: itemNames,
      });
      setIsMatching(false);

      const results = matchResponse.data.results;
      setMatches(results);
      console.log('🔍 Local match results:', results);

      // Step 4: Set default selected match for each item
      const defaultSelections = {};
      itemNames.forEach(name => {
        defaultSelections[name] = results[name]?.[0]?.match || '';
      });
      setSelectedMatches(defaultSelections);
    } catch (error) {
      console.error('❌ Upload or processing failed:', error);
      setUploadStatus('❌ Something went wrong during upload or extraction.');
    }
  };

  const handleExportCSV = async () => {
    const headers = ['Request Item', 'Amount', 'Selected Match', 'Match Score'];
    const rows = extractedItems.map(item => {
      const requestItem = item['Request Item'];
      const amount = item['Amount'];
      const selected = selectedMatches[requestItem] || '';
      const matched = matches[requestItem]?.find(m => m.match === selected);
      const score = matched ? (matched.score * 100).toFixed(1) : '-';

      return { requestItem, amount, selected, score };
    });

    // Generate and download CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => `"${row.requestItem}","${row.amount}","${row.selected}","${row.score}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'matched_sales_order.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Send to backend to save in DB
    try {
      await axios.post('http://localhost:5000/save_order', {
        filename: file.name,
        items: rows,
      });
      console.log('✅ Sales order saved to database!');
    } catch (error) {
      console.error('❌ Failed to save order:', error);
    }
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '10px', marginTop: '1rem' }}>
      <h2>Upload a Purchase Order PDF</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload}>Upload</button>
      <p>{uploadStatus}</p>
      {isMatching && <p>🔄 Matching extracted items with catalog... please wait.</p>}


      {extractedItems.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Extracted Line Items with Catalog Matches</h3>
          <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Request Item</th>
                <th>Amount</th>
                <th>Top Catalog Match</th>
                <th>Match Score</th>
              </tr>
            </thead>
            <tbody>
              {extractedItems.map((item, index) => {
                const itemName = item['Request Item'];
                const selected = selectedMatches[itemName] || '';
                const matched = matches[itemName]?.find(m => m.match === selected);
                const score = matched ? (matched.score * 100).toFixed(1) : '-';

                return (
                  <tr key={index}>
                    <td>{itemName}</td>
                    <td>{item['Amount']}</td>
                    <td>
                      <select
                        value={selected}
                        onChange={(e) =>
                          setSelectedMatches({
                            ...selectedMatches,
                            [itemName]: e.target.value
                          })
                        }
                      >
                        {(matches[itemName] || []).map((option, i) => (
                          <option key={i} value={option.match}>
                            {option.match} ({(option.score * 100).toFixed(1)}%)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleExportCSV}>Export to CSV</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadForm;
