'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios=require("axios");
const { Payload } = require('dialogflow-fulfillment');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey("APIKEY");
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  
  function reservar (agent) {
    
    let fecha = agent.parameters["FechaInicio"];
    let fecha1 = fecha.split("T")[0];
    let fecha2 = fecha1.split("-");
    let FechaInicio = fecha2[2] + "/" + fecha2[1] + "/" + fecha2[0];
    
  	let Adultos = agent.parameters["Adultos"];
   	let Hijos = agent.parameters["Hijos"];
  	let estanciaNumero = agent.parameters["Tipodeestancia"];
  	let DiasReserva = agent.parameters["DiasReserva"];
  	let Nombre = agent.parameters["Nombre"];
  	let Apellidos = agent.parameters["Apellidos"];
    let DNI = agent.parameters["DNI"];
	let Telefono = agent.parameters["Telefono"];
    let Email = agent.parameters["Email"];
    let Seguimiento = Date.now();
    let Precio = 40*DiasReserva*Adultos + 20*DiasReserva*Hijos + estanciaNumero*DiasReserva*Adultos + estanciaNumero*DiasReserva*Hijos/2;
      	
    let Tipodeestancia = "";
    if (estanciaNumero == 0) {
      Tipodeestancia = "Solo alojamiento";
    } else if (estanciaNumero == 10){
      Tipodeestancia = "Desayuno";
    } else if (estanciaNumero == 20) {
      Tipodeestancia = "Media pensión";
    } else if (estanciaNumero == 30) {
      Tipodeestancia = "Pensión completa";
    } else {
      Tipodeestancia = "Todo incluido";
    }
    
    axios.post("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b", {Adultos,Hijos,Tipodeestancia,FechaInicio,DiasReserva,Nombre,Apellidos,Telefono,Email,DNI,Seguimiento,Precio});
  
    const msg = {
  		to: Email, 
  		from: 'oasisdoradohotel@gmail.com',
      	templateId: "d-457348f2d0f14995acb3793239d06f28",
      	dynamic_template_data: {Adultos,Hijos,Tipodeestancia,FechaInicio,DiasReserva,Nombre,Apellidos,Telefono,DNI,Seguimiento,Precio}
	};
	sgMail.send(msg);
    
    agent.add("Su reserva se ha realizado correctamente, le hemos enviado un correo a " + Email + " con todos los datos de la reserva.");
    agent.add("Su número de reserva es: " + Seguimiento);
    agent.add("El precio de su estancia es: " + Precio + "€");
   
    const botones = {
        "text": "Si desea gestionar su reserva puede hacerlo seleccionando la gestión que más se ajuste a sus necesidades:",
        "reply_markup":{
            "inline_keyboard": [
                [
                    {
                        "text": "Consultar Reserva",
                        "callback_data": "consultar_reserva"
                    }
                ],
                [
                    {
                        "text": "Modificar Reserva",
                        "callback_data": "editar_reserva"
                    }
                ],
                [
                    {
                        "text": "Cancelar Reserva",
                        "callback_data": "eliminar_reserva"
                    }
                ]
            ]
        }
    };

    agent.add(new Payload(agent.TELEGRAM, botones,{rawPayload: false, sendAsMessage: true}));
    
  }
  
  async function consultar(agent){
    
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    
    if (consultas.length>0) {
      let consulta = consultas[0];        
   	  agent.add("La reserva a nombre de " + consulta.Nombre + " " + consulta.Apellidos + " con DNI " + consulta.DNI + ", número de telefono " + consulta.Telefono + " y correo electrónico " + consulta.Email + " cuenta con las siguientes caracteristicas:");
      agent.add("Número de adultos: " + consulta.Adultos);
      agent.add("Número de niños: " + consulta.Hijos);
      agent.add("La reserva está programada para el " + consulta.FechaInicio);
      agent.add("La estancia durará " + consulta.DiasReserva + " días");
      agent.add("Su tipo de alojamiento es: " + consulta.Tipodeestancia);
      agent.add("El precio de la estancia es de: " + consulta.Precio + "€");
    } else {
    agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
    
    const botones = {
        "text": "Si desea gestionar su reserva puede hacerlo seleccionando la gestión que más se ajuste a sus necesidades:",
        "reply_markup":{
            "inline_keyboard": [
                [
                    {
                        "text": "Modificar Reserva",
                        "callback_data": "editar_reserva"
                    }
                ],
                [
                    {
                        "text": "Cancelar Reserva",
                        "callback_data": "eliminar_reserva"
                    }
                ]
            ]
        }
    };
    
    agent.add(new Payload(agent.TELEGRAM, botones,{rawPayload: false, sendAsMessage: true}));
  }
 
  async function eliminar(agent){
    
    let Seguimiento = agent.parameters["Seguimiento"];	
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    
    if (consultas.length>0) {
      await axios.delete("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
      agent.add("La reserva se ha eliminado correctamente");
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
    
    const botones4 = {
        "text": "Si desea realizar una reserva puede hacerlo seleccionando la siguiente opción:",
        "reply_markup":{
            "inline_keyboard": [
                [
                    {
                        "text": "Realizar Reserva",
                        "callback_data": "realizar_reserva"
                    }
                ]
            ]
        }
    };
    
    agent.add(new Payload(agent.TELEGRAM, botones4,{rawPayload: false, sendAsMessage: true}));
  }
  
  async function editarAdultos(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoAdultos = agent.parameters["NuevoAdultos"];
    
    let numTipodeestancia = null;
    if (consulta.Tipodeestancia == "Solo alojamiento") {
      numTipodeestancia = 0;
    } else if (consulta.Tipodeestancia == "Desayuno"){
      numTipodeestancia = 10;
    } else if (consulta.Tipodeestancia == "Media pensión") {
      numTipodeestancia = 20;
    } else if (consulta.Tipodeestancia == "Pensión completa") {
      numTipodeestancia = 30;
    } else {
      numTipodeestancia = "Todo incluido";
    }
       
    let NuevoPrecio = 40*consulta.DiasReserva*NuevoAdultos + 20*consulta.DiasReserva*consulta.Hijos + numTipodeestancia*consulta.DiasReserva*NuevoAdultos + numTipodeestancia*consulta.DiasReserva*consulta.Hijos/2;
	
    if (consultas.length>0) {

    	let Email = consulta.Email;
	    const msg = {
  			to: Email, 
  			from: 'oasisdoradohotel@gmail.com',
      		templateId: "d-6d9d05073b94442a9255a739fae76e50",
      		dynamic_template_data: {Adultos: NuevoAdultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
            	                    FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                	                Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                    	            Seguimiento:Seguimiento,Precio:NuevoPrecio}
		};
    
	    const botones1 = {
    	    "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
        	"reply_markup":{
            	"inline_keyboard": [
                	[
                    	{
                        	"text": "Consultar Reserva",
	                        "callback_data": "consultar_reserva"
    	                }
        	        ]
            	]
	        }
    	};
    
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Adultos: NuevoAdultos});
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Precio: NuevoPrecio});
      agent.add("Los adultos de su reserva han sido modificados a " + NuevoAdultos);
      agent.add("El nuevo precio de su reserva es " + NuevoPrecio + " €");
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
    

}
  
  async function editarHijos(agent) {
	let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoHijos = agent.parameters["NuevoHijos"];
    
    let numTipodeestancia = null;
    if (consulta.Tipodeestancia == "Solo alojamiento") {
      numTipodeestancia = 0;
    } else if (consulta.Tipodeestancia == "Desayuno"){
      numTipodeestancia = 10;
    } else if (consulta.Tipodeestancia == "Media pensión") {
      numTipodeestancia = 20;
    } else if (consulta.Tipodeestancia == "Pensión completa") {
      numTipodeestancia = 30;
    } else {
      numTipodeestancia = "Todo incluido";
    }
       
    let NuevoPrecio = 40*consulta.DiasReserva*consulta.Adultos + 20*consulta.DiasReserva*NuevoHijos + numTipodeestancia*consulta.DiasReserva*consulta.Adultos + numTipodeestancia*consulta.DiasReserva*NuevoHijos/2;
    
    if (consultas.length>0) {

      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:NuevoHijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:NuevoPrecio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Hijos: NuevoHijos});
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Precio: NuevoPrecio});
      agent.add("Los niños de su reserva han sido modificados a " + NuevoHijos);
      agent.add("El nuevo precio de su reserva es " + NuevoPrecio + " €");
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarFechaInicio(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    
    let NuevoFechaInicio = agent.parameters["NuevoFechaInicio"];
    let fecha1 = NuevoFechaInicio.split("T")[0];
    let fecha2 = fecha1.split("-");
    let NuevoFechaInicioFormateada = fecha2[2] + "/" + fecha2[1] + "/" + fecha2[0];

    if (consultas.length>0) {

      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:NuevoFechaInicioFormateada, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };
    
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {FechaInicio: NuevoFechaInicioFormateada});
      agent.add("La fecha de inicio de su reserva ha sido modificada a " + NuevoFechaInicioFormateada);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}

  async function editarDiasReserva(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoDiasReserva = agent.parameters["NuevoDiasReserva"];
    
    let numTipodeestancia = null;
    if (consulta.Tipodeestancia == "Solo alojamiento") {
      numTipodeestancia = 0;
    } else if (consulta.Tipodeestancia == "Desayuno"){
      numTipodeestancia = 10;
    } else if (consulta.Tipodeestancia == "Media pensión") {
      numTipodeestancia = 20;
    } else if (consulta.Tipodeestancia == "Pensión completa") {
      numTipodeestancia = 30;
    } else {
      numTipodeestancia = "Todo incluido";
    }
       
    let NuevoPrecio = 40*NuevoDiasReserva*consulta.Adultos + 20*NuevoDiasReserva*consulta.Hijos + numTipodeestancia*NuevoDiasReserva*consulta.Adultos + numTipodeestancia*NuevoDiasReserva*consulta.Hijos/2;

    if (consultas.length>0) {
      
      let Email = consulta.Email;    
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:NuevoDiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:NuevoPrecio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };
    
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {DiasReserva: NuevoDiasReserva});
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Precio: NuevoPrecio});
      agent.add("La duración de su reserva ha sido modificada a " + NuevoDiasReserva + " días");
      agent.add("El nuevo precio de su reserva es " + NuevoPrecio + " €");
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarNombre(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoNombre = agent.parameters["NuevoNombre"];
    
    if (consultas.length>0) {
      
      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:NuevoNombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Nombre: NuevoNombre});
      agent.add("El nombre de su reserva ha sido modificado a " + NuevoNombre);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarApellidos(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoApellidos = agent.parameters["NuevoApellidos"];
    
      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:NuevoApellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };
	
    if (consultas.length>0) {
      
      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };
    
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Apellidos: NuevoApellidos});
      agent.add("Los apellidos de su reserva han sido modificados a " + NuevoApellidos);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarDNI(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoDNI = agent.parameters["NuevoDNI"];
    
    if (consultas.length>0) {

      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:NuevoDNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {DNI: NuevoDNI});
      agent.add("El DNI de su reserva ha sido modificado a " + NuevoDNI);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarEmail(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoEmail = agent.parameters["NuevoEmail"];
    
    if (consultas.length>0) {

      let Email = NuevoEmail;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Email: NuevoEmail});
      agent.add("El email de su reserva ha sido modificado a " + NuevoEmail);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  async function editarTelefono(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let NuevoTelefono = agent.parameters["NuevoTelefono"];
    
      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: consulta.Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:NuevoTelefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:consulta.Precio}
      };
    
    if (consultas.length>0) {

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Telefono: NuevoTelefono});
      agent.add("El teléfono de su reserva ha sido modificado a " + NuevoTelefono);
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}

  async function editarTipoDeEstancia(agent) {
    let Seguimiento = agent.parameters["Seguimiento"];
    let respuesta = await axios.get("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento);
  	let consultas = respuesta.data;
    let consulta = consultas[0];
    let estanciaNumero = agent.parameters["NuevoTipodeestancia"];
    let NuevoPrecio = 40*consulta.DiasReserva*consulta.Adultos + 20*consulta.DiasReserva*consulta.Hijos + estanciaNumero*consulta.DiasReserva*consulta.Adultos + estanciaNumero*consulta.DiasReserva*consulta.Hijos/2;
    
    let Tipodeestancia = "";
    if (estanciaNumero == 0) {
      Tipodeestancia = "Solo alojamiento";
    } else if (estanciaNumero == 10){
      Tipodeestancia = "Desayuno";
    } else if (estanciaNumero == 20) {
      Tipodeestancia = "Media pensión";
    } else if (estanciaNumero == 30) {
      Tipodeestancia = "Pensión completa";
    } else {
      Tipodeestancia = "Todo incluido";
    }
    
    if (consultas.length>0) {
    
      let Email = consulta.Email;
      const msg = {
          to: Email, 
          from: 'oasisdoradohotel@gmail.com',
          templateId: "d-6d9d05073b94442a9255a739fae76e50",
          dynamic_template_data: {Adultos: consulta.Adultos, Hijos:consulta.Hijos, Tipodeestancia: Tipodeestancia,
                                  FechaInicio:consulta.FechaInicio, DiasReserva:consulta.DiasReserva,Nombre:consulta.Nombre,
                                  Apellidos:consulta.Apellidos,Telefono:consulta.Telefono,DNI:consulta.DNI,
                                  Seguimiento:Seguimiento,Precio:NuevoPrecio}
      };

      const botones1 = {
          "text": "Para consultar los nuevos datos de su reserva puede hacerlo seleccionando la siguiente opción:",
          "reply_markup":{
              "inline_keyboard": [
                  [
                      {
                          "text": "Consultar Reserva",
                          "callback_data": "consultar_reserva"
                      }
                  ]
              ]
          }
      };

      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Tipodeestancia: Tipodeestancia});
      await axios.patch("https://sheet.best/api/sheets/2fc335cc-13cc-41b2-b3ab-26d4499bf79b/Seguimiento/" + Seguimiento, {Precio: NuevoPrecio});
      agent.add("El tipo de alojamiento de su reserva ha sido modificado a " + Tipodeestancia);
      agent.add("El nuevo precio de su reserva es " + NuevoPrecio + " €");
      agent.add(new Payload(agent.TELEGRAM, botones1,{rawPayload: false, sendAsMessage: true}));
      sgMail.send(msg);
    } else {
      agent.add("No existe ninguna reserva con ese número de seguimiento");
    }
}
  
  let intentMap = new Map();
  intentMap.set('realizar_reserva', reservar);
  intentMap.set('consultar_reserva', consultar);
  intentMap.set('eliminar_reserva', eliminar);
  intentMap.set('editar_adultos', editarAdultos);
  intentMap.set('editar_hijos', editarHijos);
  intentMap.set('editar_tipodeestancia', editarTipoDeEstancia);
  intentMap.set('editar_fechaInicio', editarFechaInicio);
  intentMap.set('editar_diasReserva', editarDiasReserva);
  intentMap.set('editar_nombre', editarNombre);
  intentMap.set('editar_apellidos', editarApellidos);
  intentMap.set('editar_DNI', editarDNI);
  intentMap.set('editar_telefono', editarTelefono);
  intentMap.set('editar_email', editarEmail);
  agent.handleRequest(intentMap);
    
});
