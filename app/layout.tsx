import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'ForkTrade — Intent, independently remixed',description:'A deliberate thesis-to-remix workspace for dreamDEX Perps testnet. Offline demo by default.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
