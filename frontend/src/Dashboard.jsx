import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get_orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const response = await axios.get(`http://localhost:5000/get_order/${orderId}`);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error('❌ Failed to fetch order details:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Processed Sales Orders</h2>

      {orders.length === 0 ? (
        <p>No sales orders processed yet.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Filename</th>
              <th>Upload Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.filename}</td>
                <td>{new Date(order.upload_date).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleViewDetails(order.id)}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedOrder && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Order Details for: {selectedOrder.filename}</h3>
          <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Request Item</th>
                <th>Amount</th>
                <th>Selected Match</th>
                <th>Match Score</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.data.map((item, index) => (
                <tr key={index}>
                  <td>{item.requestItem}</td>
                  <td>{item.amount}</td>
                  <td>{item.selected}</td>
                  <td>{item.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
