export const event = Object.freeze({address:'Rua Nápoles, nº 23 – Bairro Veneza, São Bernardo do Campo – SP.',whatsapp:'',message:'Olá! Recebi o convite da inauguração da Pri Beauty e confraternização do Salão Cleyde Ribeiro e gostaria de confirmar minha presença no dia 28 de novembro.'});
export const sequence = ['closed','video-playing','handoff-preparing','handoff','card-extracting','card-expanding','opened'];
export function whatsappUrl(number){return /^55\d{10,11}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(event.message)}` : null;}
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`;
