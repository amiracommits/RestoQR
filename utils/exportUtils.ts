import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export const exportarPDF = (data: any[]): void => {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Reporte de Pedidos - Tacos La Luna', 14, 20)

  const tableRows = data.map(p => [
    format(new Date(p.created_at), 'dd/MM/yy HH:mm'),
    `Mesa ${p.mesas?.numero_mesa}`,
    p.es_adicional ? 'ADICIONAL' : 'PRINCIPAL',
    p.total.toFixed(2),
    p.estado.toUpperCase()
  ])

  autoTable(doc, {
    head: [['Fecha', 'Mesa', 'Tipo', 'Total (L)', 'Estado']],
    body: tableRows,
    startY: 30,
    theme: 'striped',
    headStyles: { fillColor: [30, 56, 158] }
  })

  doc.save(`Reporte_Pedidos_${format(new Date(), 'dd-MM-yyyy')}.pdf`)
}
