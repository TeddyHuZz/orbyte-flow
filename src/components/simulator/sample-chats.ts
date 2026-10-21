/**
 * Sample WhatsApp conversations featuring realistic Malaysian SME ordering habits
 * (Manglish, colloquial Malay, mixed wholesale queries).
 */

export interface ChatMessage {
  id: string;
  sender: 'contact' | 'user';
  text: string;
  timestamp: string;
  isOrderMessage?: boolean;
}

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatarText: string;
  avatarBg: string;
  businessType: string;
  tinStatus: 'verified' | 'missing';
  tin?: string;
  unreadCount?: number;
  lastMessage: string;
  lastTime: string;
  messages: ChatMessage[];
}

export const SAMPLE_CONTACTS: ChatContact[] = [
  {
    id: 'c1',
    name: 'Kedai Runcit Ah Seng',
    phone: '+6012-3456789',
    avatarText: 'AS',
    avatarBg: 'bg-emerald-600',
    businessType: 'Sundry Grocery (PJ Old Town)',
    tinStatus: 'verified',
    tin: 'C2459102901',
    unreadCount: 1,
    lastTime: '10:42 AM',
    lastMessage: 'Boss, order 15 carton Milo, 5 tin susu pekat...',
    messages: [
      {
        id: 'm1',
        sender: 'contact',
        text: 'Morning boss! Hope business is good.',
        timestamp: '10:38 AM',
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'Morning Ah Seng, yes all good. How can we help today?',
        timestamp: '10:40 AM',
      },
      {
        id: 'm3',
        sender: 'contact',
        text: 'Boss, order 15 carton Milo, 5 tin susu pekat, 10 bag beras jasmine 10kg. Deliver to PJ site by Friday afternoon ya.',
        timestamp: '10:42 AM',
        isOrderMessage: true,
      },
    ],
  },
  {
    id: 'c2',
    name: 'Restoran Maju Curry House',
    phone: '+6017-8899123',
    avatarText: 'MC',
    avatarBg: 'bg-amber-600',
    businessType: 'F&B Restaurant (Bangsar)',
    tinStatus: 'verified',
    tin: 'C1089201928',
    unreadCount: 2,
    lastTime: '09:15 AM',
    lastMessage: 'Nak tambah 20 papan telur gred A...',
    messages: [
      {
        id: 'm4',
        sender: 'contact',
        text: 'Salam boss, stock minyak masak seri murni makin surut.',
        timestamp: '09:12 AM',
      },
      {
        id: 'm5',
        sender: 'contact',
        text: 'Bagi 12 botol minyak masak seri murni 5kg dan nak tambah 20 papan telur gred A. Tolong hantar esok pagi before lunch crowd.',
        timestamp: '09:15 AM',
        isOrderMessage: true,
      },
    ],
  },
  {
    id: 'c3',
    name: 'Perniagaan Jaya Hardware',
    phone: '+6019-2233445',
    avatarText: 'JH',
    avatarBg: 'bg-indigo-600',
    businessType: 'Contractor & Hardware (Klang)',
    tinStatus: 'missing',
    tin: undefined,
    unreadCount: 0,
    lastTime: 'Yesterday',
    lastMessage: 'Please prepare invoice for pantry restock',
    messages: [
      {
        id: 'm6',
        sender: 'contact',
        text: 'Hi supplier, our pantry restock for site workers:',
        timestamp: 'Yesterday 3:15 PM',
      },
      {
        id: 'm7',
        sender: 'contact',
        text: 'Need 8 carton Nescafe Classic 200g and 25 carton Milo 1kg. Need official invoice for claims.',
        timestamp: 'Yesterday 3:16 PM',
        isOrderMessage: true,
      },
      {
        id: 'm8',
        sender: 'user',
        text: 'Noted Jaya Hardware! Checking our stock and TIN registration now.',
        timestamp: 'Yesterday 3:20 PM',
      },
    ],
  },
];
