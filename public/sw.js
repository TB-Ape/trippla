const i18n = {
  de: {
    someone: "Jemand",
    actions: { created: "hat hinzugefügt", updated: "hat aktualisiert" },
    types: {
      itinerary: "Reiseplan",
      expense: "Ausgabe",
      packing: "Packliste",
      transport: "Transport",
      stage: "Etappe",
      poll: "Umfrage",
    },
  },
  en: {
    someone: "Someone",
    actions: { created: "added", updated: "updated" },
    types: {
      itinerary: "itinerary",
      expense: "expense",
      packing: "packing list",
      transport: "transport",
      stage: "stage",
      poll: "poll",
    },
  },
};

function formatNotification(payload) {
  const lang = (self.navigator?.language || "en").startsWith("de") ? "de" : "en";
  const strings = i18n[lang];

  const actor = payload.actorName || strings.someone;
  const action = strings.actions[payload.action] || strings.actions.created;
  const type = strings.types[payload.entityType] || payload.entityType;

  const title = `${actor} — ${payload.tripName}`;
  const body = payload.entityName
    ? `${action} ${type}: "${payload.entityName}"`
    : `${action} ${type}`;

  return { title, body };
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = null;
  }

  const { title, body } = payload
    ? formatNotification(payload)
    : { title: "Trippla", body: event.data.text() };

  const url = payload?.url ?? "/trips";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/trips";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a Trippla tab is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            return client.navigate(url).catch(() => {
              // client.navigate() not supported in this browser — fall through to openWindow
            });
          }
        }
        // Otherwise open a new tab
        return clients.openWindow(url);
      })
  );
});
