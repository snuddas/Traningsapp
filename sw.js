const CACHE='halsa-1.33.1-build32';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

// Installera: spara appens grundfiler. Väntar på att användaren trycker "Uppdatera nu".
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
});

// Aktivera: ta bort gamla cachar och ta över alla öppna flikar.
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// "Uppdatera nu" i appen skickar SKIP_WAITING.
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});

// Hämtning: bara egna filer. Garmin, matsökning, bilder och typsnitt går direkt mot nätet.
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  // Sidan: nätet först så att nya versioner kommer fram, cachen om du är offline.
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req)
        .then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r})
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // Övriga egna filer (ikoner, manifest): cachen först, annars nätet.
  e.respondWith(
    caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{
      if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
      return r;
    }))
  );
});
