import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/components/common/data-table/DataTableColumnHeader.vue'
import DataTableRowActions from './DataTableRowActions.vue'

export interface Payment {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  email: string
}

export const columns: ColumnDef<Payment, unknown>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(value === true),
        ariaLabel: '選取全部',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        checked: row.getIsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') =>
          row.toggleSelected(value === true),
        ariaLabel: '選取列',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) =>
      h(DataTableColumnHeader, { column: column as unknown as import('@tanstack/vue-table').Column<unknown, unknown>, title: 'Email' }),
    cell: ({ row }) => h('div', { class: 'lowercase' }, row.getValue('email')),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) =>
      h(DataTableColumnHeader, { column: column as unknown as import('@tanstack/vue-table').Column<unknown, unknown>, title: '金額' }),
    cell: ({ row }) => {
      const amount = Number.parseFloat(String(row.getValue('amount')))
      const formatted = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
      }).format(amount)
      return h('div', { class: 'text-right font-medium' }, formatted)
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) =>
      h(DataTableColumnHeader, { column: column as unknown as import('@tanstack/vue-table').Column<unknown, unknown>, title: '狀態' }),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return h(
        'span',
        {
          class:
            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        },
        status,
      )
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) =>
      h(DataTableRowActions, {
        payment: row.original,
      }),
  },
]
