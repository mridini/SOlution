# Sales Order Matching Application

This project is a web application that allows users to:

- Upload a Purchase Order PDF
- Extract line items from the PDF
- Match extracted items against a product catalog
- Allow manual corrections (Human-in-the-loop experience)
- Export matched sales orders as CSV
- Save and version sales orders (edit old ones without overwriting)
- View a dashboard of all processed sales orders

---

## 🛠 Technologies Used
- React (Frontend)
- Flask (Backend API)
- SQLite (Database)
- RapidFuzz (Fuzzy matching engine)
- Axios (HTTP client)
- Pandas (Catalog data handling)

---

## 🚀 How to Run Locally

### 1. Backend (Flask)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server.py
```
- Runs on http://localhost:5000
- Make sure `unique_fastener_catalog.csv` is present

### 2. Frontend (React)
```bash
cd frontend
npm install
npm start
```
- Runs on http://localhost:3000

---

## ✨ Features

### Upload and Extract
- Upload any PDF file.
- Extracts line items automatically.

### Matching
- Auto-matches extracted items against product catalog using fuzzy search.
- Shows top 5 suggestions per line item.

### Manual Corrections
- If the top match is incorrect, user can search entire catalog manually.
- Overrides are clearly shown separately.

### Export
- Download a CSV of the matched sales order.
- Save the processed order to backend with version tracking.

### Dashboard
- View all processed sales orders.
- View or edit any past order.
- Editing an order saves a new version (old version stays preserved).

### Versioning
- Edited orders reference the original parent order.
- Full history of changes maintained.

---

## 🗂 Project Structure

```
/frontend
  /src
    /components
      UploadForm.jsx
      Dashboard.jsx
    App.js
    index.js

/backend
  server.py
  instance/sales_orders.db
  uploads/
  unique_fastener_catalog.csv

README.md
```

---

## 📝 Future Enhancements
- Version history viewer (show all edits linked together)
- Role-based access (admin vs viewer)
- Deploy to AWS or Heroku

---

## 🙏 Credits
Built with ❤️ for streamlined sales operations and human-in-the-loop matching workflows.

---

Feel free to reach out if you have any questions or want to contribute!

