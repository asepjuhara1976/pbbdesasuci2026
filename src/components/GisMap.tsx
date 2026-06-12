import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Search, 
  MapPin, 
  Layers, 
  DollarSign, 
  User, 
  QrCode, 
  CreditCard,
  X,
  Compass,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  Locate,
  Globe,
  Share2,
  Trash2,
  Undo2,
  PlusCircle,
  FileText,
  Hash,
  Activity,
  AlertTriangle,
  Building2,
  Map as MapIcon
} from 'lucide-react';
import L from 'leaflet';
import { Taxpayer, PaymentLog } from '../types';

interface GisMapProps {
  taxpayers: Taxpayer[];
  onSaveTaxpayer: (taxpayer: Taxpayer) => Promise<void>;
  onAddPaymentLog: (log: PaymentLog) => Promise<void>;
  isLoggedIn: boolean; // if logged in as Petugas
  initialSelectedTaxpayer?: Taxpayer | null;
  onClearInitialSelected?: () => void;
  darkMode?: boolean;
}

export default function GisMap({ 
  taxpayers, 
  onSaveTaxpayer, 
  onAddPaymentLog, 
  isLoggedIn,
  initialSelectedTaxpayer = null,
  onClearInitialSelected,
  darkMode = true
}: GisMapProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLayer, setFilterLayer] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<Taxpayer | null>(null);
  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(true);

  // Drawing and Creation states
  const [drawingMode, setDrawingMode] = useState<'none' | 'edit-geotag' | 'add-new'>('none');
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);

  // New Taxpayer registration fields
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('');
  const [newObjectAddress, setNewObjectAddress] = useState<string>('');
  const [newLandArea, setNewLandArea] = useState<number>(100);
  const [newBuildingArea, setNewBuildingArea] = useState<number>(60);
  const [newNjopLand, setNewNjopLand] = useState<number>(3000000);
  const [newNjopBuilding, setNewNjopBuilding] = useState<number>(2000000);
  const [newTaxError, setNewTaxError] = useState<string>('');

  // Checkout & payment states
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qris' | 'va'>('qris');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [showInvoiceCheck, setShowInvoiceCheck] = useState<boolean>(false);

  // Ref container hooks for leaflet initialization
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonsGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawGroupRef = useRef<L.FeatureGroup | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);

  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Keep state references updated for event list callbacks (avoiding stale closures)
  const drawingModeRef = useRef<'none' | 'edit-geotag' | 'add-new'>('none');
  drawingModeRef.current = drawingMode;

  const isLoggedInRef = useRef<boolean>(isLoggedIn);
  isLoggedInRef.current = isLoggedIn;

  // Center coordinate of representation (Desa Suci district)
  const defaultCenter = { lat: -7.216212144387112, lng: 107.923912462039 };

  // Sync initialSelectedTaxpayer if passed
  useEffect(() => {
    if (initialSelectedTaxpayer) {
      setSelectedTaxpayer(initialSelectedTaxpayer);
      if (onClearInitialSelected) {
        onClearInitialSelected();
      }
    }
  }, [initialSelectedTaxpayer]);

  // Helper: format formatting numbers inside IDR currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Helper: Retrieve centroid/average of list of points
  const getCentroid = (coords: [number, number][]): { lat: number; lng: number } => {
    if (coords.length === 0) return { lat: defaultCenter.lat, lng: defaultCenter.lng };
    let sumLat = 0;
    let sumLng = 0;
    for (let i = 0; i < coords.length; i++) {
      sumLat += coords[i][0];
      sumLng += coords[i][1];
    }
    return {
      lat: Number((sumLat / coords.length).toFixed(6)),
      lng: Number((sumLng / coords.length).toFixed(6))
    };
  };

  // Helper: Get Polygon bounds (either stored or center-generated fallback)
  const getTaxpayerPolygon = (tp: Taxpayer): [number, number][] => {
    if (tp.polygonCoords && tp.polygonCoords.length >= 3) {
      return tp.polygonCoords;
    }
    // Centered auto-constructed rectangular parcel fallback
    const halfSize = 0.0003;
    return [
      [tp.lat + halfSize, tp.lng - halfSize],
      [tp.lat + halfSize, tp.lng + halfSize],
      [tp.lat - halfSize, tp.lng + halfSize],
      [tp.lat - halfSize, tp.lng - halfSize]
    ];
  };

  // Helper: HTML inline SVG styling inside custom pins
  const createCustomIcon = (isPaid: boolean, isSelected: boolean) => {
    const color = isSelected ? '#22d3ee' : (isPaid ? '#06b6d4' : '#ef4444');
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-5 w-5 animate-ping rounded-full opacity-40" style="background-color: ${color}"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-[#161616]" style="background-color: ${color}"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Leaflet map setup mounting
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already created
    if (mapInstanceRef.current) return;

    // Build the leaflet instance
    const map = L.map(mapContainerRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: 16,
      maxZoom: 21,
      zoomControl: false,
      attributionControl: false
    });

    // Dynamic tiles which merge seamlessly with the chosen mode
    const initialTileUrl = isSatelliteMode 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' 
      : (darkMode 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');

    const tileLayer = L.tileLayer(initialTileUrl, {
      maxZoom: 21,
      maxNativeZoom: isSatelliteMode ? 18 : 20
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Setup dedicated vector layers
    const polygonsGroup = L.featureGroup().addTo(map);
    const markersGroup = L.featureGroup().addTo(map);
    const drawGroup = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;
    polygonsGroupRef.current = polygonsGroup;
    markersGroupRef.current = markersGroup;
    drawGroupRef.current = drawGroup;

    // Listen to click coordinates inside drawing mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (drawingModeRef.current === 'none') {
        setSelectedTaxpayer(null);
        return;
      }
      const { lat, lng } = e.latlng;
      setDrawingCoords(prev => [...prev, [lat, lng]]);
    });

    // Solve immediate layout refresh checks
    setTimeout(() => { map.invalidateSize(); }, 50);
    setTimeout(() => { map.invalidateSize(); }, 200);
    setTimeout(() => { map.invalidateSize(); }, 500);
    setTimeout(() => { map.invalidateSize(); }, 1250);

    // Dynamic scale resize observer for flawless fluid rendering
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      resizeObserver.disconnect();
    };
  }, []);

  // Swap Leaflet Tiles dynamically when dark mode or satellite mode changes
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      const tileUrl = isSatelliteMode 
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' 
        : (darkMode 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
      
      // Update maximum native zoom levels
      // Satellite maxes out at zoom 18 natively, standard CartoDB maxes out at 20 natively.
      // Leaflet upscales tiles smoothly beyond native max zoom up to level 21.
      tileLayerRef.current.options.maxNativeZoom = isSatelliteMode ? 18 : 20;
      tileLayerRef.current.options.maxZoom = 21;
      
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [darkMode, isSatelliteMode]);

  // Update dynamic overlays on map when elements change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonsGroup = polygonsGroupRef.current;
    const markersGroup = markersGroupRef.current;

    if (!map || !polygonsGroup || !markersGroup) return;

    polygonsGroup.clearLayers();
    markersGroup.clearLayers();

    const isDrawingActive = drawingMode !== 'none';

    // Match filtered elements
    const matchedList = taxpayers.filter(tp => {
      const matchesSearch = tp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tp.id.includes(searchQuery);
      
      if (filterLayer === 'paid') return matchesSearch && tp.isPaid;
      if (filterLayer === 'unpaid') return matchesSearch && !tp.isPaid;
      return matchesSearch;
    });

    matchedList.forEach(tp => {
      const polygonCoords = getTaxpayerPolygon(tp);
      const isSelected = selectedTaxpayer?.id === tp.id;
      const color = tp.isPaid ? '#06b6d4' : '#ef4444';

      // Assemble vector polygon boundary shape
      const polygon = L.polygon(polygonCoords, {
        color: color,
        weight: isSelected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: isSelected ? 0.35 : 0.12,
        dashArray: tp.isPaid ? '' : '4, 4',
        interactive: !isDrawingActive // Disable pointer events when drafting details!
      });

      if (!isDrawingActive) {
        polygon.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedTaxpayer(tp);
        });
      }

      polygon.addTo(polygonsGroup);

      // Centroid location marker placement
      const centroid = getCentroid(polygonCoords);
      const marker = L.marker([centroid.lat, centroid.lng], {
        icon: createCustomIcon(tp.isPaid, isSelected),
        interactive: !isDrawingActive // Disable pointer events when drafting details!
      });

      if (!isDrawingActive) {
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedTaxpayer(tp);
        });
      }

      marker.addTo(markersGroup);

      // Focus map viewport when selected Taxpayer is updated
      if (isSelected && !isDrawingActive) {
        map.setView([centroid.lat, centroid.lng], 17, { animate: true });
      }
    });
  }, [taxpayers, filterLayer, searchQuery, selectedTaxpayer, drawingMode]);

  // Handle active Drawing coordinates dynamic feedback
  useEffect(() => {
    const map = mapInstanceRef.current;
    const drawGroup = drawGroupRef.current;

    if (!map || !drawGroup) return;

    drawGroup.clearLayers();

    if (drawingCoords.length === 0) return;

    const lineColor = '#f59e0b'; // beautiful warning gold stroke color

    let polylineObj: L.Polyline | null = null;
    let polygonObj: L.Polygon | null = null;

    // Draw lines connecting points
    if (drawingCoords.length > 1) {
      polylineObj = L.polyline(drawingCoords, {
        color: lineColor,
        weight: 3,
        dashArray: '5, 5',
        opacity: 0.9
      }).addTo(drawGroup);

      // Draw active preview polygon block
      if (drawingCoords.length >= 3) {
        polygonObj = L.polygon(drawingCoords, {
          color: lineColor,
          weight: 1,
          fillColor: lineColor,
          fillOpacity: 0.15
        }).addTo(drawGroup);
      }
    }

    const localCoords = [...drawingCoords];

    // Place vertices number markers
    drawingCoords.forEach((coord, idx) => {
      const marker = L.marker(coord, {
        draggable: true,
        icon: L.divIcon({
          className: 'drawing-vertex-bubble',
          html: `
            <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing" style="cursor: grab;">
              <div class="w-6 h-6 bg-amber-500 border-2 border-slate-950 rounded-full text-[10px] font-mono text-slate-950 font-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform">
                ${idx + 1}
              </div>
              <span class="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 bg-cyan-450 border border-slate-950 rounded-full animate-ping"></span>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        })
      });

      // Update instant local coordinates on drag for slick 60fps movement
      marker.on('drag', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        localCoords[idx] = [lat, lng];

        if (polylineObj) {
          polylineObj.setLatLngs(localCoords);
        }
        if (polygonObj) {
          polygonObj.setLatLngs(localCoords);
        }
      });

      // Synchronize back with state on drag release
      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setDrawingCoords(prev => {
          const next = [...prev];
          next[idx] = [lat, lng];
          return next;
        });
      });

      marker.addTo(drawGroup);
    });

    // No automatic snap zoom/center when points are updated to prevent jumping/resetting zoom
  }, [drawingCoords, drawingMode]);

  // Clean drawings and reset states
  const cancelDrawingMode = () => {
    setDrawingMode('none');
    setDrawingCoords([]);
    setShowRegisterForm(false);
    setNewTaxError('');
  };

  // Undo last drawing coordinate vertex
  const handleUndoPoint = () => {
    if (drawingCoords.length === 0) return;
    setDrawingCoords(prev => prev.slice(0, prev.length - 1));
  };

  // Handle Geotag (Denah) update persistence
  const handleSaveGeotag = async () => {
    if (!selectedTaxpayer || drawingCoords.length < 3) return;

    const { lat, lng } = getCentroid(drawingCoords);

    const updated: Taxpayer = {
      ...selectedTaxpayer,
      lat: lat,
      lng: lng,
      polygonCoords: drawingCoords,
      updatedAt: new Date().toISOString()
    };

    await onSaveTaxpayer(updated);
    setSelectedTaxpayer(updated);
    cancelDrawingMode();
  };

  // Handle new tax object registration submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewTaxError('');

    if (!newOwnerName || !newOwnerAddress || !newObjectAddress) {
      setNewTaxError('Harap isi lengkapi seluruh kolom isian data!');
      return;
    }

    const totalLandValue = newLandArea * newNjopLand;
    const totalBuildingValue = newBuildingArea * newNjopBuilding;
    const estTaxAnnual = Math.round((totalLandValue + totalBuildingValue) * 0.001);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedNop = `32.73.010.021.001-${generatedNopSuffix(randomSuffix)}.0`;

    const { lat, lng } = getCentroid(drawingCoords);

    const newTaxpayer: Taxpayer = {
      id: generatedNop,
      name: newOwnerName,
      address: newOwnerAddress,
      objectAddress: newObjectAddress,
      landArea: Number(newLandArea),
      buildingArea: Number(newBuildingArea),
      njopLand: Number(newNjopLand),
      njopBuilding: Number(newNjopBuilding),
      totalTax: estTaxAnnual,
      isPaid: false,
      lat: lat,
      lng: lng,
      polygonCoords: drawingCoords,
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveTaxpayer(newTaxpayer);
      setSelectedTaxpayer(newTaxpayer);
      // Clean up fields
      setNewOwnerName('');
      setNewOwnerAddress('');
      setNewObjectAddress('');
      cancelDrawingMode();
    } catch (err) {
      setNewTaxError('Gagal menyimpan objek pajak baru. Silakan coba kembali.');
    }
  };

  const generatedNopSuffix = (num: number) => {
    return String(num).padStart(4, '0');
  };

  // Trigger simulated payment flow
  const triggerSimulationPayment = async () => {
    if (!selectedTaxpayer) return;
    setIsProcessingPayment(true);

    setTimeout(async () => {
      const now = new Date();
      const updatedTaxpayer: Taxpayer = {
        ...selectedTaxpayer,
        isPaid: true,
        paymentDate: now.toISOString().split('T')[0],
        paymentMethod: selectedPaymentMethod === 'qris' ? 'QRIS Mandiri Dinamis' : 'BCA Virtual Account',
        updatedAt: now.toISOString()
      };

      const newLog: PaymentLog = {
        id: `PAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        nop: selectedTaxpayer.id,
        taxpayerName: selectedTaxpayer.name,
        amount: selectedTaxpayer.totalTax,
        method: selectedPaymentMethod === 'qris' ? 'QRIS' : 'BCA Virtual Account',
        timestamp: now.toISOString()
      };

      await onSaveTaxpayer(updatedTaxpayer);
      await onAddPaymentLog(newLog);

      setSelectedTaxpayer(updatedTaxpayer);
      setIsProcessingPayment(false);
      setIsPaying(false);
      setShowInvoiceCheck(true);
    }, 1800);
  };

  // Map zooms via Leaflet direct interface
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    mapInstanceRef.current?.setView([defaultCenter.lat, defaultCenter.lng], 16);
  };

  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Fitur deteksi lokasi GPS tidak didukung oleh browser Anda.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsLoading(false);

        const map = mapInstanceRef.current;
        if (!map) return;

        // Set view to current location with detailed zoom level
        map.setView([latitude, longitude], 17);

        // Remove old GPS marker if exists
        if (gpsMarkerRef.current) {
          gpsMarkerRef.current.remove();
        }

        // Create sleek blue pulse marker representing GPS user coordinate
        const gpsIcon = L.divIcon({
          className: 'gps-user-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-blue-500 opacity-40"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([latitude, longitude], { icon: gpsIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 font-sans text-xs text-slate-800 dark:text-slate-200">
              <strong class="text-blue-600 dark:text-blue-400 block font-bold">Lokasi GPS Anda</strong>
              <span class="text-slate-500 dark:text-slate-400 text-[10px] block mt-0.5">Akurasi: ±${Math.round(accuracy)} meter</span>
              <span class="text-slate-400 dark:text-slate-500 text-[9px] font-mono block mt-0.5">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
            </div>
          `)
          .openPopup();

        gpsMarkerRef.current = marker;
      },
      (error) => {
        setGpsLoading(false);
        console.error('GPS localization error:', error);
        let errorMsg = 'Gagal mendeteksi lokasi GPS Anda.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Akses izin lokasi GPS ditolak oleh browser/pengguna.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Jaringan atau satelit GPS tidak dapat mendeteksi posisi.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu tunggu permintaan lokasi GPS habis.';
        }
        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="flex-grow flex-1 flex flex-col relative select-none animate-fadeIn bg-white dark:bg-[#0C0C0C]">
      
      {/* MAP HEADER FLOATING SEARCH CONTROLLER */}
      {drawingMode === 'none' ? (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <div className="flex gap-1.5 items-center bg-white/95 dark:bg-[#161616]/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Cari NOP atau Nama WP..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent border-none outline-none w-full py-1 text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 cursor-pointer">
                  <X className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex rounded-xl bg-slate-100 dark:bg-[#0C0C0C] p-0.5 border border-slate-200 dark:border-white/5">
              <button 
                onClick={() => setFilterLayer('all')}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${filterLayer === 'all' ? 'bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/10 text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}
              >
                Semua
              </button>
              <button 
                onClick={() => setFilterLayer('paid')}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${filterLayer === 'paid' ? 'bg-cyan-500 dark:bg-[#06b6d4] text-white dark:text-slate-950 font-bold' : 'text-slate-500'}`}
              >
                Lunas
              </button>
              <button 
                onClick={() => setFilterLayer('unpaid')}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${filterLayer === 'unpaid' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'text-slate-500'}`}
              >
                Nunggak
              </button>
            </div>

            {/* Quick Administrator PBB adding entry */}
            {isLoggedIn && (
              <button 
                onClick={() => {
                  setDrawingMode('add-new');
                  setDrawingCoords([]);
                  setSelectedTaxpayer(null);
                }}
                className="bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-black text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-lg shrink-0"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Lahan Baru
              </button>
            )}
          </div>
        </div>
      ) : (
        // ACTIVE DRAWING/SKETCHING MODE BANNER CONTROLS
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <div className="bg-white/95 dark:bg-[#161616]/98 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/20 shadow-2xl space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wide">
                  {drawingMode === 'add-new' ? 'Pena Digitasi Objek PBB Baru' : 'Sunting Denah Bidang Lahan'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Ketuk minimal 3 titik sudut pada koordinat peta sebenarnya untuk membentuk batas denah/persil tanah.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-2.5 mt-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                Denah: <strong className="text-amber-600 dark:text-amber-500">{drawingCoords.length} Titik Sudut</strong>
              </span>

              <div className="flex gap-1.5">
                <button
                  onClick={handleUndoPoint}
                  disabled={drawingCoords.length === 0}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-[#0C0C0C] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 disabled:opacity-30 rounded-lg flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  <Undo2 className="h-3 w-3" /> Tangguhkan
                </button>
                <button
                  onClick={() => setDrawingCoords([])}
                  disabled={drawingCoords.length === 0}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-[#0C0C0C] hover:bg-rose-500/10 border border-slate-200 dark:border-white/5 text-rose-600 dark:text-rose-400 disabled:opacity-30 rounded-lg flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  <Trash2 className="h-3 w-3" /> Mengulang
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={cancelDrawingMode}
                className="w-full py-2.5 bg-slate-50 dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer text-[11px]"
              >
                Batal Menggambar
              </button>

              {drawingMode === 'add-new' ? (
                <button
                  onClick={() => setShowRegisterForm(true)}
                  disabled={drawingCoords.length < 3}
                  className="w-full py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-950 dark:disabled:hover:bg-white text-white dark:text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
                >
                  <FileText className="h-3.5 w-3.5" /> Lanjut Isi Formulir
                </button>
              ) : (
                <button
                  onClick={handleSaveGeotag}
                  disabled={drawingCoords.length < 3}
                  className="w-full py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-950 dark:disabled:hover:bg-white text-white dark:text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Simpan Denah Objek
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER THE GEOSPATIAL REAL MAP AREA */}
      <div className="w-full h-[480px] relative bg-slate-100 dark:bg-[#050505] overflow-hidden border-b border-slate-200 dark:border-white/5">
        
        {/* Leaflet instance element mapping container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-10" />

        {/* COMPASS ROSACE AND SCALE OVERLAY */}
        <div className="absolute right-3.5 bottom-3.5 flex flex-col items-center gap-1.5 pointer-events-none select-none z-[1000]">
          <div className="bg-white/90 dark:bg-[#161616]/95 backdrop-blur px-2.5 py-1 rounded text-[8px] font-mono font-black border border-slate-200 dark:border-white/5 shadow-sm text-slate-600 dark:text-slate-450 uppercase tracking-widest">
            REAL GIS ENGINE (Leaflet Map)
          </div>
          <div className="bg-white/90 dark:bg-[#161616]/95 backdrop-blur p-2 rounded-full border border-slate-200 dark:border-white/5 shadow-md">
            <Compass className="h-5 w-5 text-cyan-600 dark:text-cyan-400 rotate-12 transition-transform duration-500 animate-spin-slow" />
          </div>
        </div>

        {/* SIDE FLOATING PANEL ZOOM CONTROLLER */}
        <div className="absolute left-3.5 bottom-3.5 flex flex-col gap-1.5 pointer-events-auto z-[1000]">
          <button 
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 shadow-md border border-slate-200 dark:border-white/5 text-cyan-600 dark:text-cyan-400 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 shadow-md border border-slate-200 dark:border-white/5 text-cyan-600 dark:text-cyan-400 cursor-pointer"
          >
            <Minus className="h-4 w-4 stroke-[2.5]" />
          </button>
          <button 
            onClick={handleGpsLocation}
            title="Diteksi Lokasi GPS Saat Ini"
            className="p-2 rounded-xl bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 shadow-md border border-slate-200 dark:border-white/5 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center justify-center relative"
          >
            {gpsLoading ? (
              <RefreshCw className="h-4 w-4 stroke-[2.5] animate-spin text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Locate className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
          <button 
            onClick={() => setIsSatelliteMode(prev => !prev)}
            title={isSatelliteMode ? "Ganti ke Mode Peta Standar" : "Ganti ke Mode Citra Satelit"}
            className={`p-2 rounded-xl shadow-md border cursor-pointer flex items-center justify-center transition-all duration-200 ${
              isSatelliteMode 
                ? 'bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600' 
                : 'bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/5 text-cyan-600 dark:text-cyan-400'
            }`}
          >
            <Globe className="h-4 w-4 stroke-[2.5] animate-pulse-slow" />
          </button>
          <button 
            onClick={handleResetView}
            className="text-[9px] font-extrabold px-1.5 py-1.5 rounded-lg bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 shadow-md border border-slate-200 dark:border-white/5 text-center uppercase tracking-wider cursor-pointer font-mono"
          >
            Reset
          </button>
        </div>
      </div>

      {/* REGISTRATION FORM side drawers replaces the panel when creating objects */}
      <AnimatePresence>
        {showRegisterForm && (
          <motion.div
            initial={{ y: 350, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 350, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-[#0A0A0A] rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.15)] dark:shadow-[0_-12px_45px_rgba(0,0,0,0.9)] border-t border-slate-200 dark:border-white/10 p-5 shrink-0 z-[1100] max-h-[90%] overflow-y-auto pointer-events-auto select-none"
          >
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <span className="text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-lg font-bold font-mono inline-block bg-amber-550/10 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
                  Formulir Objek PBB Baru
                </span>
                <h3 className="text-base font-black text-slate-800 dark:text-white mt-1.5 font-sans">
                  Detail Berkas Lahan Geospasial
                </h3>
              </div>
              <button 
                onClick={() => setShowRegisterForm(false)}
                className="p-2 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-white/5"
              >
                <X className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {newTaxError && (
                <div className="bg-rose-500/15 p-2.5 rounded-xl text-rose-650 dark:text-rose-400 font-bold border border-rose-500/25">
                  ⚠️ {newTaxError}
                </div>
              )}

              {/* Informational specs */}
              <div className="space-y-3 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                <h4 className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Identitas Wajib Pajak
                </h4>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold">NAMA LENGKAP</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dr. Ir. Gunawan Mulyadi"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-450 font-bold">ALAMAT DOMISILI KTP</label>
                  <textarea
                    rows={2}
                    placeholder="Alamat domisili saat ini..."
                    value={newOwnerAddress}
                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                    className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Physical details block */}
              <div className="space-y-3 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                <h4 className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Struktur Fisik & NJOP Bumi
                </h4>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold">ALAMAT OBJEK LANDASAN PAJAK (Letak Lahan)</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Blok G-09, Jl. Dago Atas, Desa Suci, Bandung"
                    value={newObjectAddress}
                    onChange={(e) => setNewObjectAddress(e.target.value)}
                    className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px]">LUAS TANAH (m²)</label>
                    <input
                      type="number"
                      value={newLandArea}
                      onChange={(e) => setNewLandArea(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px]">LUAS BANGUNAN (m²)</label>
                    <input
                      type="number"
                      value={newBuildingArea}
                      onChange={(e) => setNewBuildingArea(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pb-1">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px]">NJOP BUMI / m² (Rp)</label>
                    <input
                      type="number"
                      step={100000}
                      value={newNjopLand}
                      onChange={(e) => setNewNjopLand(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px]">NJOP BANGUNAN / m² (Rp)</label>
                    <input
                      type="number"
                      step={100000}
                      value={newNjopBuilding}
                      onChange={(e) => setNewNjopBuilding(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Estimate premium invoice card */}
              <div className="bg-slate-100 dark:bg-[#121212] p-4 rounded-2.5xl border border-slate-200 dark:border-white/5 space-y-2">
                <span className="text-slate-500 dark:text-slate-450 text-[10px] block uppercase font-mono tracking-widest">Ketetapan Pajak Tahunan (0.1% NJOP)</span>
                <div className="flex justify-between text-xs text-slate-650 dark:text-slate-400">
                  <span>NJOP Bumi:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{formatIDR(newLandArea * newNjopLand)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-650 dark:text-slate-400">
                  <span>NJOP Bangunan:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{formatIDR(newBuildingArea * newNjopBuilding)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/10 pt-2 text-cyan-600 dark:text-cyan-400 font-black">
                  <span>Estimasi Ketetapan PBB:</span>
                  <span className="text-sm">{formatIDR(Math.round(((newLandArea * newNjopLand) + (newBuildingArea * newNjopBuilding)) * 0.001))}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="flex-1 py-3 bg-slate-50 dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 font-bold rounded-xl border border-slate-200 dark:border-white/5 cursor-pointer text-center text-xs"
                >
                  Kembali Desain
                </button>
                <button
                  type="submit"
                  className="flex-grow py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-black rounded-xl cursor-pointer text-center text-xs"
                >
                  Daftarkan Objek Lahan Baru
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTaxpayer && drawingMode === 'none' && (
          <motion.div 
            initial={{ y: 280, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 280, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-[#0A0A0A] rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.15)] dark:shadow-[0_-12px_45px_rgba(0,0,0,0.9)] border-t border-slate-200 dark:border-white/10 p-5 shrink-0 z-[1050] max-h-[85%] overflow-y-auto pointer-events-auto select-none"
          >
            {/* Header Drawer */}
            <div className="flex justify-between items-start mb-3.5">
              <div>
                <span className={`text-[9.5px] uppercase tracking-widest px-3 py-1 rounded-xl font-bold font-mono inline-block ${
                  selectedTaxpayer.isPaid 
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/25'
                }`}>
                  {selectedTaxpayer.isPaid ? '● PBB Lunas' : '● Tagihan Belum Bayar'}
                </span>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mt-2">
                  {selectedTaxpayer.name}
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono tracking-tight block mt-1">
                  NOP: {selectedTaxpayer.id}
                </span>
              </div>
              <button 
                onClick={() => {
                  setSelectedTaxpayer(null);
                  setIsPaying(false);
                }}
                className="p-2 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-white/5 transition"
              >
                <X className="h-4.5 w-4.5 text-slate-500 dark:text-slate-450" />
              </button>
            </div>

            {/* Render conditional forms */}
            {isPaying ? (
              // CHECKOUT FORM TERMINAL SIMULATOR
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-slate-50 dark:bg-[#121212] p-4 rounded-2xl flex justify-between items-center text-xs border border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase tracking-wider">Total Jumlah Pajak PBB</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">
                      {formatIDR(selectedTaxpayer.totalTax)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">MD-554</span>
                </div>

                {/* Choose Method Router */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 tracking-wider">Metode Pembayaran</span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('qris')}
                      className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        selectedPaymentMethod === 'qris' 
                          ? 'border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400' 
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#121212]/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <QrCode className="h-5 w-5" />
                      <span className="text-xs font-bold">QRIS Dinamis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('va')}
                      className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        selectedPaymentMethod === 'va' 
                          ? 'border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400' 
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#121212]/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="text-xs font-bold">Virtual Account (VA)</span>
                    </button>
                  </div>
                </div>

                {/* Checkout presentation */}
                {selectedPaymentMethod === 'qris' ? (
                  <div className="bg-slate-50 dark:bg-[#121212] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center text-center">
                    <div className="relative p-2 bg-white rounded-xl border border-slate-200">
                      {/* Simulate a beautifully stylized QR code with raw colors */}
                      <div className="w-36 h-36 bg-slate-100 flex flex-wrap p-1 relative items-center justify-center">
                        <div className="absolute top-1 left-1 w-8 h-8 border-4 border-slate-900" />
                        <div className="absolute top-1 right-1 w-8 h-8 border-4 border-slate-900" />
                        <div className="absolute bottom-1 left-1 w-8 h-8 border-4 border-slate-900" />
                        <div className="w-28 h-28 bg-[radial-gradient(#111_2.5px,transparent_1px)] [background-size:6px_6px]" />
                        <QrCode className="h-10 w-10 text-slate-800 absolute" />
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 mt-3 font-mono">PINDAI QRIS VIA GOPAY / OVO / SHOPEEPAY</span>
                    <span className="text-[9.5px] text-cyan-600 dark:text-cyan-400 mt-1.5 font-mono font-bold animate-pulse">Menunggu verifikasi transaksi real-time...</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-[#121212]/90 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">BCA Virtual Account</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white py-1 px-2.5 bg-slate-200 dark:bg-white/5 rounded">8802 3273 0122 001</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Mandiri Virtual Account</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white py-1 px-2.5 bg-slate-200 dark:bg-white/5 rounded">7009 3273 0122 001</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block text-center mt-1">Gunakan ATM atau M-Banking untuk melakukan transfer sesuai tagihan.</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaying(false)}
                    className="flex-1 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={triggerSimulationPayment}
                    disabled={isProcessingPayment}
                    className="flex-grow py-3 px-4 text-xs font-extrabold text-white dark:text-slate-950 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 disabled:opacity-50 rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white dark:text-slate-950" />
                        Memverifikasi Finansial...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-white dark:text-slate-950" />
                        Konfirmasi Pembayaran Lunas
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              // GENERAL TAX INFORMATION COMPREHENSIVE SHEET
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-450 block text-[9.5px]">Pemilik (Wajib Pajak)</span>
                    <span className="font-bold text-slate-800 dark:text-[#f1f1f1] mt-1 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {selectedTaxpayer.name}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-450 block text-[9.5px]">Alamat Domisili</span>
                    <span className="font-semibold text-slate-750 dark:text-slate-350 block mt-1 leading-tight text-[10px] line-clamp-2">
                      {selectedTaxpayer.address}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#121212] p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                    <span className="text-slate-500">Alamat Objek Pajak:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-300 text-right w-2/3">{selectedTaxpayer.objectAddress}</span>
                  </div>
                  <hr className="border-slate-200 dark:border-white/5" />
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                    <span className="text-slate-500">Luas Bumi / Bangunan:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-300">{selectedTaxpayer.landArea} m² / {selectedTaxpayer.buildingArea} m²</span>
                  </div>
                  <hr className="border-slate-200 dark:border-white/5" />
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                    <span className="text-slate-500">NJOP Bumi (per m²):</span>
                    <span className="font-medium text-slate-800 dark:text-slate-300">{formatIDR(selectedTaxpayer.njopLand)}</span>
                  </div>
                  <hr className="border-slate-200 dark:border-white/5" />
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                    <span className="text-slate-500">NJOP Bangunan (per m²):</span>
                    <span className="font-medium text-slate-800 dark:text-slate-300">{formatIDR(selectedTaxpayer.njopBuilding)}</span>
                  </div>
                </div>

                <div className="bg-cyan-500/5 dark:bg-cyan-550/10 p-4 rounded-2xl border border-cyan-500/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Ketetapan Pokok PBB</span>
                    <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 block mt-0.5">
                      {formatIDR(selectedTaxpayer.totalTax)}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20 font-bold">
                    Tarif Efektif 0.1%
                  </span>
                </div>

                {/* Date completed panel if paid */}
                {selectedTaxpayer.isPaid && (
                  <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-[#121212] p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">DIbayar lunas pada</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-400">{selectedTaxpayer.paymentDate} via {selectedTaxpayer.paymentMethod || 'Digital VA'}</span>
                    </div>
                  </div>
                )}

                {/* BOTTOM BUTTONS CHANNEL */}
                <div className="flex gap-2">
                  {/* Petugas Geotagging button if logged in */}
                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawingMode('edit-geotag');
                        setDrawingCoords(selectedTaxpayer.polygonCoords && selectedTaxpayer.polygonCoords.length >= 3 
                          ? selectedTaxpayer.polygonCoords 
                          : getTaxpayerPolygon(selectedTaxpayer)
                        );
                      }}
                      className="flex-1 py-3 text-xs bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-cyan-600 dark:text-cyan-455 font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <MapPin className="h-4 w-4" />
                      Ubah / Gambar Denah
                    </button>
                  )}

                  {!selectedTaxpayer.isPaid && (
                    <button
                      type="button"
                      onClick={() => setIsPaying(true)}
                      className="flex-grow py-3 px-6 text-xs text-white dark:text-slate-950 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 font-extrabold rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <DollarSign className="h-4 w-4" />
                      SIMULASIKAN PEMBAYARAN LUNAS
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL BILL SUCCESS TRANSACTION NOTIFIER */}
      {showInvoiceCheck && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#161616] p-6 rounded-[28px] max-w-sm w-full text-center border border-slate-200 dark:border-white/10 shadow-3xl">
            <div className="w-16 h-16 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <span className="text-[10px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-950/40 px-2.5 py-1 rounded-full uppercase border border-cyan-500/20">
              Pembayaran Berhasil!
            </span>
            <h4 className="text-base font-black text-slate-800 dark:text-white mt-3.5">E-Bukti PBB Terbit Resmi</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Tagihan PBB untuk wajib pajak pada peta persil geospasial telah sepenuhnya diverifikasi lunas sistem.
            </p>

            {/* Simulated Printed Receipt fields */}
            <div className="bg-slate-50 dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-3.5 rounded-xl mt-4 text-xs font-mono text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">NOP:</span>
                <span className="font-bold text-slate-750 dark:text-slate-350">{selectedTaxpayer?.id.substring(0, 15)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NAMA:</span>
                <span className="font-bold text-slate-750 dark:text-slate-350 truncate max-w-[150px]">{selectedTaxpayer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">STATUS:</span>
                <span className="text-cyan-650 dark:text-cyan-400 font-bold">LUNAS (BUKTI SAH)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInvoiceCheck(false)}
              className="w-full mt-5 py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition font-extrabold"
            >
              Selesai & Tutup Bukti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
