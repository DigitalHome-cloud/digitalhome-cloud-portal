# DigitalHome.Cloud Portal

The **DigitalHome.Cloud Portal** is the central entry point to the DigitalHome ecosystem. It provides access to all applications, documentation, and tools related to designing, managing, and operating smart homes using the DHC semantic model.

This repository contains the **Gatsby-based Portal UI**, including support for multilingual content (EN/DE/FR), dynamic tile-based navigation, and integration with the wider DigitalHome.Cloud platform.

---

## 🚀 Features

### ✅ Tile-Based Launchpad
A clean, modern interface inspired by Odoo / SAP Fiori, offering navigation tiles grouped into:
- **General** – About, Sign-In, Sign-Up, Coffee Support
- **Design** – SmartHome Designer Demo (access-controlled)
- **Operate** – SmartHome Operator Demo (access-controlled)

### 🌍 Full Internationalization (i18n)
Built with `gatsby-plugin-react-i18next`, supporting:
- English (default)
- German
- French

Language switcher included in the header.

### 🎨 Custom DHC Branding
- Dark-mode design
- D-LAB-5 footer
- DHC color palette and typography

### 🔧 Extensible Architecture
The portal is designed to grow with the DigitalHome ecosystem:
- Ontology Designer
- SmartHome Designer
- SmartHome Operator (future)
- Documentation Portal

---

## 📁 Project Structure

```
.
├── src
│   ├── components
│   │   ├── Header.js
│   │   ├── Layout.js
│   │   ├── Tile.js
│   │   └── TileGrid.js
│   ├── locales
│   │   ├── en/common.json
│   │   ├── de/common.json
│   │   └── fr/common.json
│   ├── pages
│   │   ├── index.js
│   │   ├── about.js
│   │   └── ...
│   └── styles/global.css
├── scripts
│   └── edit-translations.js
├── gatsby-config.js
└── gatsby-browser.js
```

---

## 🧩 Internationalization

### JSON-based translations
Each language has its own folder under `src/locales/<lang>/common.json`.

### Editing translations interactively
A custom CLI tool allows editing translations in a guided console:
```
yarn edit:translations
```
This tool:
- Loads EN as the master language
- Displays every key
- Lets you edit DE/FR interactively
- Saves back to disk

---

## ⚙️ Development

### Install dependencies
```
yarn install
```

### Start development server
```
yarn develop
```
The site will be available at:
```
http://localhost:8000
```

### Build for production
```
yarn build
```

---

## 🚀 Deployment (AWS Amplify)
The Portal is deployed via **AWS Amplify**, with branch-to-environment mapping:

| Branch | Environment | URL | Purpose |
|--------|-------------|------|---------|
| main   | prod        | https://portal.digitalhome.cloud | Production |
| stage  | stage       | https://stage-portal.digitalhome.cloud | Release candidate |
| beta   | beta        | https://beta-portal.digitalhome.cloud | Beta testing |
| alpha  | alpha       | https://alpha-portal.digitalhome.cloud | Experimental |

---

## 🧱 Related Repositories

- **digitalhome-cloud-semantic-core** – ontology & SHACL  
- **digitalhome-cloud-ontology-designer** – Blockly-based ontology tool  
- **digitalhome-cloud-smarthome-designer** – Digital home instance editor  
- **digitalhome-cloud-docs** – full platform documentation  

---

## 🧠 Philosophy
DigitalHome.Cloud is developed under the spirit of **D-LAB-5**, which combines:
- Human-centered design  
- Sustainable architecture  
- Engineering craftsmanship  
- Technology in service of nature, not dominating it  

"Where roots meet digital."

---

## 📄 License
MIT unless otherwise specified.

---

For more information, visit:  
👉 https://digitalhome.cloud
