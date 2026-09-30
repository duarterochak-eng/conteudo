import { Anton, Inter_Tight } from "next/font/google";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--f-titulo" });
const interTight = Inter_Tight({ subsets: ["latin"], display: "swap", variable: "--f-corpo" });

/** Classes que definem --f-titulo (Anton) e --f-corpo (Inter Tight). Vão no elemento de fora da página. */
export const fontes = `${anton.variable} ${interTight.variable}`;
