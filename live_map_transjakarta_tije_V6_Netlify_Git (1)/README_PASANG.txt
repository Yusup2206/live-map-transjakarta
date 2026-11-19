LIVE MAP ARMADA TRANSJAKARTA — V6
================================

SUMBER TIDAK DIUBAH:
  https://api.tije.info/buses (SSE/EventSource)
  Situs pembuat: https://tije.info/

MENGAPA VERSI SEBELUMNYA GAGAL:
- Membuka index.html melalui file:// tidak menjalankan server/proxy.
- Paket HTML/Netlify Drop yang bersifat statis tidak otomatis mengaktifkan Edge Function.
- SSE dengan nama event `snapshot` dan `delta` tidak diterima oleh `onmessage` saja;
  V6 mendengarkan event bernama dan event `message` biasa.
- Konfirmasi live tidak cukup dari indikator SSE OPEN: harus ada payload armada yang valid.

CARA PASANG (DIREKOMENDASIKAN: GIT + NETLIFY):
1. Ekstrak ZIP ini. Pastikan folder public, netlify/edge-functions, dan netlify.toml berada di tingkat teratas.
2. Upload seluruh isi folder ekstraksi ke sebuah repository GitHub (bukan index.html saja).
3. Di Netlify: Add new project > Import an existing project > pilih GitHub/repository tersebut.
4. Pengaturan build: tidak ada build command; publish directory `public`.
5. Deploy. Netlify akan memasang Edge Function dari netlify.toml.
6. Buka https://DOMAIN-NETLIFY/tije-proxy?health=1
   HARUS ada JSON berisi "service":"tije-sse-proxy-v6".
7. Buka https://DOMAIN-NETLIFY/tije-proxy?diagnose=1
   Periksa upstreamStatus = 200 dan validSse = true.
8. Buka halaman utama domain Netlify. Status berhasil hanya setelah snapshot/delta bus diterima.

PENTING:
- NETLIFY DROP/DRAG AND DROP biasa TIDAK cocok untuk paket yang perlu Edge Function.
- File HTML lokal hanya dapat mencoba koneksi langsung; browser dapat menolak CORS dari API pihak ketiga.
- Jika /tije-proxy?health=1 gagal, proxy belum dideploy. Jangan gunakan file HTML lokal untuk mengujinya.
- Jika health berhasil tetapi upstreamStatus = 403/404/429/5xx, masalah berada pada API sumber
  atau pembatasan akses dari server Netlify. Dashboard tidak bisa memaksa API sumber merespons.
- Jika situs tije.info mengubah endpoint, upstream harus diubah sesuai dokumentasi dari pembuatnya.

PENGUJIAN TANPA DATA NYATA:
- Tambah `?selftest=1` ke URL dashboard untuk menguji parser snapshot/delta. Mode akan diberi label SIMULASI.
- Jangan gunakan hasil simulasi sebagai informasi lokasi bus.

CATATAN KEAMANAN:
- Proxy terkunci ke satu upstream; URL tidak menerima alamat eksternal arbitrer (bukan open proxy).
- Tidak ada credential pribadi atau token yang diperlukan/disimpan.
- Tidak ada data live yang dikarang untuk menutupi kegagalan koneksi.
