# Daily Activity Dashboard — Panduan Pemasangan (V5)

## 1. Google Sheets + Apps Script (backend)
1. Buka Google Sheets Anda → **Extensions → Apps Script**.
2. Hapus isi lama, tempel seluruh isi `apps-script/kode.gs`.
3. Ubah dua baris di bagian atas:
   - `EDITOR_PIN` → PIN untuk Bu Miranty (bisa input / ubah / hapus / upload).
   - `VIEWER_PIN` → PIN untuk Anda (hanya melihat / monitoring).
   > Selama PIN masih default, backend menolak semua permintaan (disengaja, demi keamanan).
4. **Project Settings → Time zone → (GMT+07:00) Asia/Jakarta**.
5. Pilih fungsi **`setup`** → **Run** → izinkan akses. Ini membuat 4 sheet otomatis: `DISPOSISI`, `SPPD`, `MOM`, `TODO`.
6. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**.
   URL `/exec` tetap sama, jadi `lib/config.ts` tidak perlu diubah.
   (Jika deploy baru: Execute as **Me**, Who has access **Anyone**.)

## 2. GitHub → Vercel (frontend)
1. Ekstrak `daily-activity-V5.zip`, ganti isi repo GitHub Anda dengan isinya (commit & push).
2. Vercel otomatis build ulang → buka `daily-activity-ochre.vercel.app`.
3. (Opsional) Jika URL Apps Script berubah: Vercel → Settings → Environment Variables →
   `NEXT_PUBLIC_APPS_SCRIPT_URL` = URL `/exec` baru, lalu redeploy.

## 3. Memindahkan riwayat rekap manual
Di menu **Disposisi SLA / Rekap SPPD / MOM**:
1. Klik **Template** → unduh template Excel (berisi sheet Template, Contoh, Petunjuk).
2. Isi/tempel data lama, **atau langsung upload file rekap lama Anda** (format beberapa sheet per tahun juga dikenali).
3. Klik **Upload rekap** → cek pratinjau → **Impor**.
- Aman diulang: baris yang REFF / Nomor SPPD-nya sudah ada otomatis dilewati.
- Tanggal riwayat dipertahankan apa adanya (tidak diganti hari ini).
- Rumus SLA identik dengan Excel lama (BM ≤ 3 hari, Non BM ≤ 10 hari, SPPD ≤ 3 hari).

## 4. Cara pakai harian (Bu Miranty)
- **Disposisi baru**: Tambah disposisi → isi → tanggal Pengajuan otomatis. Tahap berikutnya (BM, Head Regional, VP, Direksi, Selesai, Kirim ke User) cukup klik tombol di baris tersebut; tanggal tercatat otomatis oleh server (WIB). "Kirim ke User" juga mengubah status menjadi Done.
- **SPPD baru**: Terbitkan SPPD baru → pilih tanggal dari kalender → Approve BM / Kirim dicatat dengan satu klik.
- **Koreksi**: ikon pensil pada baris (semua kolom termasuk tanggal bisa diubah).
- **Home**: klik tanggal di kalender untuk melihat semua aktivitas hari itu; ketik To-Do lalu ENTER.

## 5. Monitoring
Masuk memakai `VIEWER_PIN`: seluruh data terlihat, semua tombol input disembunyikan dan ditolak juga oleh server. Data otomatis tersinkron tiap 60 detik; tombol **Refresh** untuk manual. Statistik SLA & update terbaru ada di Home dan di tiap menu.

## Keamanan
- Versi lama membuka seluruh data ke siapa pun yang punya URL Apps Script. Versi ini menolak semua permintaan tanpa PIN, dan `doGet` tidak lagi mengembalikan data.
- Folder `data/` berisi Excel asli (data karyawan/keuangan). Gunakan repo GitHub **Private**, atau hapus folder itu dari repo — aplikasi tidak membutuhkannya.
- PIN tersimpan di browser hanya jika "Ingat di perangkat ini" dicentang.
