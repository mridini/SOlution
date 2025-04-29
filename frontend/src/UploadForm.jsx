// UploadForm.jsx (version before advanced features like PST timestamps, versioning, and custom filename)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';

function UploadForm() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [matches, setMatches] = useState({});
  const [selectedMatches, setSelectedMatches] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [isMatching, setIsMatching] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentEditingItem, setCurrentEditingItem] = useState('');
  const [productNames, setProductNames] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await axios.get('http://localhost:5000/get_catalog');
        setProductNames(response.data.products);
      } catch (error) {
        console.error('❌ Failed to fetch catalog:', error);
      }
    };

    fetchCatalog();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus('');
    setExtractedItems([]);
    setMatches({});
    setSelectedMatches({});
    setManualOverrides({});
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('❗ Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const filename = uploadResponse.data.filename;

      const extractResponse = await axios.post('http://localhost:5000/extract', {
        filename: filename,
      });

      const items = extractResponse.data;
      setExtractedItems(items);
      setUploadStatus('✅ File uploaded and extracted successfully!');

      const itemNames = items.map(item => item['Request Item']);
      setIsMatching(true);
      const matchResponse = await axios.post('http://localhost:5000/local_match', {
        items: itemNames,
      });
      setIsMatching(false);

      const results = matchResponse.data.results;
      setMatches(results);

      const defaultSelections = {};
      itemNames.forEach(name => {
        defaultSelections[name] = results[name]?.[0]?.match || '';
      });
      setSelectedMatches(defaultSelections);
      setManualOverrides({});
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
      const isManual = manualOverrides[requestItem];
      const score = isManual ? 'Manual' : matched ? (matched.score * 100).toFixed(1) : '-';
      return { requestItem, amount, selected, score };
    });

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
  };

  const handleOpenModal = (itemName) => {
    setCurrentEditingItem(itemName);
    setIsModalOpen(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      return;
    }
    const results = productNames.filter(name =>
      name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    setSearchResults(results);
  };

  const handleSelectResult = (selectedMatch) => {
    setSelectedMatches(prev => ({ ...prev, [currentEditingItem]: selectedMatch }));
    setManualOverrides(prev => ({ ...prev, [currentEditingItem]: true }));
    setIsModalOpen(false);
  };

  const getScoreColor = (score, isManual) => {
    if (score === '-' || isManual) return 'blue';
    const numericScore = parseFloat(score);
    if (numericScore >= 98) return 'green';
    if (numericScore >= 90) return 'orange';
    return 'red';
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Upload a Purchase Order PDF</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} /><br /><br />
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
                const isManual = manualOverrides[itemName];
                const score = isManual ? 'Manual' : matched ? (matched.score * 100).toFixed(1) : '-';

                return (
                  <tr key={index}>
                    <td>{itemName}</td>
                    <td>{item['Amount']}</td>
                    <td>
                      <select value={isManual ? '-' : selected} disabled={isManual}>
                        {(matches[itemName] || []).map((option, i) => (
                          <option key={i} value={option.match}>
                            {option.match} ({(option.score * 100).toFixed(1)}%)
                          </option>
                        ))}
                      </select>
                      {isManual && (
                        <div style={{ marginTop: '5px', fontStyle: 'italic', color: 'blue' }}>
                          Selected: {selected}
                        </div>
                      )}
                      <button
                        style={{ marginTop: '5px', display: 'block' }}
                        onClick={() => handleOpenModal(itemName)}
                      >
                        🔍 Search Catalog
                      </button>
                    </td>
                    <td style={{ color: getScoreColor(score, isManual) }}>{score}</td>
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

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', padding: '20px'
          }
        }}
      >
        <h2>Search Catalog</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type to search..."
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <div>
          {searchResults.map((result, index) => (
            <div key={index} style={{ padding: '5px 0', cursor: 'pointer' }} onClick={() => handleSelectResult(result)}>
              {result}
            </div>
          ))}
        </div>
        <button onClick={() => setIsModalOpen(false)}>Close</button>
      </Modal>
    </div>
  );
}

export default UploadForm;