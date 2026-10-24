// Lo script del modulo di prenotazione, scritto senza librerie e in ES5
// perché funzioni anche sui telefoni meno recenti.

export function scriptPrenotazione(): string {
  return `
(function(){
  var f=document.getElementById("prenota");if(!f)return;
  var api=f.getAttribute("data-api"),max=+f.getAttribute("data-max"),gruppo=+f.getAttribute("data-gruppo");
  var data=f.data,ora=f.ora,persone=f.persone,esito=document.getElementById("esito"),invio=f.querySelector("button[type=submit]");
  function iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
  var oggi=new Date();data.min=iso(oggi);var lim=new Date();lim.setDate(lim.getDate()+max);data.max=iso(lim);
  function mostra(t,errore){esito.textContent=t;esito.className="esito visibile"+(errore?" errore":"")}
  function opzioni(elenco,vuoto){ora.innerHTML="";if(!elenco.length){var o=document.createElement("option");o.value="";o.textContent=vuoto;ora.appendChild(o);return}
    elenco.forEach(function(h){var o=document.createElement("option");o.value=h;o.textContent=h;ora.appendChild(o)})}
  function carica(){
    if(!data.value)return;opzioni([],"Cerco gli orari liberi...");
    fetch(api+"/disponibilita?data="+encodeURIComponent(data.value)+"&persone="+encodeURIComponent(persone.value||"2"))
      .then(function(r){return r.json()}).then(function(d){
        opzioni(d.orari||[],"Nessun orario libero: provate un altro giorno o chiamateci");
        if(d.gruppo_grande)mostra("Per più di "+gruppo+" persone la richiesta arriva al titolare, che vi richiama per confermare.");
        else if(esito.className.indexOf("errore")<0)esito.className="esito";
      }).catch(function(){opzioni([],"Orari non disponibili: chiamateci")});
  }
  data.addEventListener("change",carica);persone.addEventListener("change",carica);
  f.addEventListener("submit",function(e){
    e.preventDefault();
    if(!f.privacy.checked){mostra("Per prenotare serve la presa visione dell'informativa privacy.",true);return}
    if(!data.value||!ora.value||!f.nome.value||!f.telefono.value){mostra("Mancano giorno, orario, nome o telefono.",true);return}
    var corpo={data:data.value,ora:ora.value,persone:+persone.value,nome:f.nome.value,telefono:f.telefono.value,note:f.note.value,
      note_salute:f.note_salute.value,consenso_note_salute:f.consenso_note_salute.checked,privacy:true,sito_web:f.sito_web.value};
    invio.disabled=true;
    fetch(api+"/prenotazioni",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(corpo)})
      .then(function(r){return r.json()}).then(function(d){
        invio.disabled=false;
        if(d.ok&&(d.confermata||d.da_confermare)){mostra(d.messaggio);f.reset();opzioni([],"Scegli prima il giorno")}
        else mostra(d.messaggio||"Non è stato possibile prenotare: chiamateci.",true);
      }).catch(function(){invio.disabled=false;mostra("Connessione assente: riprovate o chiamateci.",true)});
  });
})();`;
}
