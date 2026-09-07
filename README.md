# WhatsApp Notification Service Bridge

A lightweight backend microservice built with Node.js and Express to automate and dispatch operational notifications via WhatsApp. Designed to integrate through authenticated HTTP requests with Google Apps Script triggers and external webhooks.

This service utilizes `@whiskeysockets/baileys` to manage direct WebSocket connections to the WhatsApp network without relying on headless browser instances (such as Chromium/Puppeteer), minimizing memory footprints for deployment in resource-constrained cloud containers.

---

## Architecture and Workflow

1. **Session Persistence:** Multi-file authentication state handled via `useMultiFileAuthState`, ensuring seamless auto-reconnection during network disruptions or container restarts.
2. **Remote QR Code Generation:** An accessible `GET /qr` endpoint rendering a dynamic DataURL image in-browser for initial device pairing without requiring terminal/CLI access.
3. **Protected Dispatch:** A secure `POST /send-alert` endpoint protected by Bearer Token authorization, sanitizing international phone numbers and dispatching payloads directly to target JIDs.

---

## API Reference

### 1. Status and Pairing
* **Method:** `GET`
* **Route:** `/qr`
* **Description:** Returns an interactive QR code to establish a new WhatsApp session, or displays operational status if already authenticated.

### 2. Message Dispatch
* **Method:** `POST`
* **Route:** `/send-alert`
* **Headers:** 
  * `Authorization: Bearer <API_KEY>`
  * `Content-Type: application/json`
* **Payload:**
```json
{
  "telefono": "569XXXXXXXX",
  "mensaje": "Automated notification body"
}
