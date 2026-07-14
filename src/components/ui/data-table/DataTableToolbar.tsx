import { Table } from "@tanstack/react-table"
import { Search, X } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Filter...",
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-9 w-[250px] lg:w-[350px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
        {isFiltered && (
          <button
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-3 flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </button>
        )}
      </div>
      {/* We can add View Options / Column Toggles here on the right */}
    </div>
  )
}
