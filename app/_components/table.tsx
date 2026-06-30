"use client";

import React from "react";

interface TableProps<T> {
  headers: React.ReactNode[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function Table({
  headers,
  data,
  renderRow,
  emptyMessage = "No records found.",
  className = ""
}: TableProps<any>) {
  return (
    <div className={`overflow-x-auto w-full border border-zinc-800 bg-zinc-900/30 rounded-3xl backdrop-blur-md shadow-lg ${className}`}>
      <table className="min-w-full divide-y divide-zinc-850 text-left border-collapse select-none">
        <thead className="bg-zinc-900/80">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-450 border-b border-zinc-850"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-850">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-5 py-12 text-center text-xs text-zinc-500 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
    </div>
  );
}
