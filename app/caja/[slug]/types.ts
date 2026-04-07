// app/caja/[slug]/types.ts

export interface DetalleFactura {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  productos: {
    nombre: string;
  };
}

export interface Factura {
  id: string;
  total: number;
  estado: string;
  numero_pedido_amigable: number;
  created_at: string;
  mesa_id: string;
  mesas: {
    id: string;
    numero_mesa: string;
  };
  detalle_facturas: DetalleFactura[];
}

export interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
  logo_url?: string;
}

export interface CajaDashboardProps {
  restaurante: Restaurante;
  facturasIniciales: Factura[]; // 👈 Ya no son pedidos, son facturas
}
