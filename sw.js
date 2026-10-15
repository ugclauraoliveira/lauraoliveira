/* =========================================================
   SW.JS (Service Worker)
   Fica "dormindo" no navegador/celular, mesmo com o site e o
   navegador fechados. Quando o nosso servidor manda um push,
   o sistema desperta este arquivo só pra mostrar a notificação.
   Não faz mais nada além disso.
========================================================= */

self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch (e) {
    dados = {};
  }

  const titulo = dados.titulo || "Lembrete";
  const opcoes = { body: dados.corpo || "" };

  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();

  const urlAdmin = new URL("./admin/", self.registration.scope).href;

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaJanelas) => {
      for (const janela of listaJanelas) {
        if (janela.url.startsWith(urlAdmin) && "focus" in janela) {
          return janela.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlAdmin);
      }
    }),
  );
});
