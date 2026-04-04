# DriveWithAndy 🇬🇭

A premium web application showcasing authentic Ghana tours, private driver services, and travel resources. Built with a focus on rich aesthetics, high-performance interactions, and seamless user experience.

## ✨ Features

- **Immersive Hero Section**: Dynamic background slider featuring high-quality imagery of Ghana's landscapes.
- **Popular Expeditions**: Curated tour cards with pricing, descriptions, and high-quality visuals.
- **Ghana Travel Dashboard**: Essential travel information including Visa requirements, Health & Safety, and Cultural Etiquette.
- **Verified Expeditions**: A dedicated section for social proof featuring real tour footage and photos.
- **Dynamic Content**: API-driven image and place listings for scalability.
- **Direct Booking**: Seamless WhatsApp integration for instant communication.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism & CSS Variables), and JavaScript (Vanilla JS).
- **Backend**: Node.js with Express.js.
- **Styling**: Google Fonts (Noto Serif & Manrope), FontAwesome Icons.
- **Environment Management**: `dotenv` for secure configuration.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (usually bundled with Node.js)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd driveWithAndy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your WhatsApp number:
   ```env
   # Format: 233XXXXXXXXX (Country code + Number, no +)
   WHATSAPP_NUMBER=233542108051
   PORT=3000
   ```

4. **Start the server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## 📁 Project Structure

```text
├── content/           # Original high-res assets & tour imagery
├── public/            # Static files served to the client
│   ├── css/           # Design system and page styles
│   ├── js/            # Client-side logic & slider functionality
│   ├── assets/        # Client-side images & icons
│   ├── index.html     # Landing page
│   └── expedition.html# Tour details page
├── src/               # Backend source code
│   ├── routes/        # API endpoints
│   └── services/      # Business logic & data management
├── server.js          # Application entry point
└── package.json       # Dependencies and scripts
```

## 🔌 API Endpoints

- `GET /api/config`: Retrieve public-facing configuration (e.g., WhatsApp number).
- `GET /api/images/:folder`: List all image assets within a specific `content/` subfolder.
- `GET /api/places`: Fetch a structured list of tourist destinations and services.

## 📄 License

This project is intended for the private use of DriveWithAndy Tours.
