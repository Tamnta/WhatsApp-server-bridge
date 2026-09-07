function enviarAlertas4Dias() {
  var hoy = new Date();
  var diaSemanaHoy = hoy.getDay(); // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado

  //REGLA ESTRICTA: Sábado y domingo NUNCA se envía nada
  if (diaSemanaHoy === 0 || diaSemanaHoy === 6) {
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var startRow = 3; 
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;

  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 16).getValues();
  
  //PARÁMETROS DEL SERVIDOR
  var SERVER_URL = "https://whatsapp-server-bridge.onrender.com/send-alert";
  var API_KEY = "_API_KEY";

  //DESTINATARIOS
  var TEL_ENCARGADO = "569XXXXXXXX";
  var CORREO_ENCARGADO = "encargado@dominio.cl";

  var TEL_TI = "569XXXXXXXX"; 
  var CORREO_TI = "";       

  hoy.setHours(0, 0, 0, 0);

  for (var i = 0; i < data.length; i++) {
    var fila = data[i];
    var fechaEvento = new Date(fila[4]); //Columna E (Fecha)
    var estado = fila[14] ? fila[14].toString().trim().toLowerCase() : ""; //Columna O (Estado)

    if (isNaN(fechaEvento.getTime()) || estado === "cancelado") continue;

    fechaEvento.setHours(0, 0, 0, 0);
    var diferenciaDias = Math.round((fechaEvento - hoy) / (1000 * 60 * 60 * 24));

    var correspondeNotificar = false;

    //LÓGICA DE DÍAS HÁBILES:
    if (diaSemanaHoy === 5) {
      // VIERNES:
      // - Avisa eventos a 4 días (Martes)
      // - Adelanta eventos a 5 días (Miércoles), para no mandar mensajes el sábado
      if (diferenciaDias === 4 || diferenciaDias === 5) {
        correspondeNotificar = true;
      }
    } else {
      // DE LUNES A JUEVES:
      // Avisa exactamente con 4 días de anticipación
      // (ej: si hoy es miércoles, avisa el evento del domingo)
      if (diferenciaDias === 4) {
        correspondeNotificar = true;
      }
    }

    if (correspondeNotificar) {
      var tipoEvento = fila[1] || "Evento";
      var iglesia = fila[2] || "No especificada";
      var horario = fila[5] || "Por definir";
      var extras = fila[9] || "Sin extras";
      var asistentes = (Number(fila[6]) || 0) + (Number(fila[7]) || 0) + (Number(fila[8]) || 0);

      var mensaje = 
        "Hola! Aviso de evento en " + diferenciaDias + " dias\n" +
        "----------------------------------\n" +
        "Tipo: " + tipoEvento + "\n" +
        "Entidad: " + iglesia + "\n" +
        "Fecha: " + fechaEvento.toLocaleDateString("es-CL") + "\n" +
        "Horario: " + horario + "\n" +
        "Asistentes aprox: " + asistentes + "\n" +
        "Extras: " + extras + "\n\n" +
        "Buen día!"

        //Texto formal para el Correo
      var mensajeCorreo = 
        "Estimado,\n\n" +
        "Junto con saludar, se informa que se encuentra programado el siguiente evento con " + diferenciaDias + " días de anticipación:\n\n" +
        "• Tipo de evento: " + tipoEvento + "\n" +
        "• Entidad / Organización: " + iglesia + "\n" +
        "• Fecha: " + fechaEvento.toLocaleDateString("es-CL") + "\n" +
        "• Horario: " + horario + "\n" +
        "• Asistentes estimados: " + asistentes + "\n" +
        "• Requerimientos técnicos / Extras: " + extras + "\n\n" +
        "Saludos cordiales,\n" +
        "Recepción / Gestión de Reservas";

      //Envío del correo 
      if (CORREO_ENCARGADO) {
        GmailApp.sendEmail(
          CORREO_ENCARGADO, 
          "[RECORDATORIO EVENTO] " + tipoEvento + " - " + iglesia, 
          mensajeCorreo 
        );
      }

      //WhatsApp al Encargado
      despacharWhatsApp(SERVER_URL, API_KEY, TEL_ENCARGADO, mensaje);

      //WhatsApp a TI
      despacharWhatsApp(SERVER_URL, API_KEY, TEL_TI, mensaje);
    }
  }
}

function despacharWhatsApp(url, apiKey, telefono, mensaje) {
  var payload = {
    telefono: telefono,
    mensaje: mensaje
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Respuesta servidor: " + response.getContentText());
  } catch (e) {
    Logger.log("Error en envio WhatsApp: " + e.toString());
  }
}
