// Shared leave-allocation policy. Kept out of leaves/actions.ts ("use server")
// because a "use server" file may only export async functions — exporting a
// plain constant from one crashes at runtime the moment a client component
// references that file's action manifest (Next.js: "A 'use server' file can
// only export async functions, found object").
export const ANNUAL_ALLOCATION = {
  paid: 12,
  sick: 6,
  unpaid: 999,
};
