export interface Taxpayer {
  id: string; // NOP (Nomor Objek Pajak)
  name: string; // Nama Lengkap Wajib Pajak
  address: string; // Alamat Domisili Wajib Pajak
  objectAddress: string; // Alamat Objek Pajak
  landArea: number; // Luas Bumi / Tanah (m2)
  buildingArea: number; // Luas Bangunan (m2)
  njopLand: number; // NJOP Bumi per m2 (Rupiah)
  njopBuilding: number; // NJOP Bangunan per m2 (Rupiah)
  totalTax: number; // Jumlah Tagihan PBB (Rupiah)
  isPaid: boolean; // Status Pembayaran (Lunas / Belum Lunas)
  lat: number; // Koordinat lintang peta
  lng: number; // Koordinat bujur peta
  polygonCoords?: [number, number][]; // Titik koordinat [lat, lng] pembentuk denah batas persil/bidang tanah
  paymentDate?: string; // Tanggal Bayar
  paymentMethod?: string; // Metode Pembayaran (QRIS, VA Bank Mandiri, VA BCA, E-Wallet GoPay)
  updatedAt: string; // Waktu update data terakhir
}

export interface PaymentLog {
  id: string;
  nop: string;
  taxpayerName: string;
  amount: number;
  method: string;
  timestamp: string;
}

export interface MapFeature {
  id: string;
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][]; // SVG map shape coordinates or coordinates relative to map area
  };
  properties: {
    nop: string;
    ownerName: string;
    isPaid: boolean;
  };
}
