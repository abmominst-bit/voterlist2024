export const UNIONS = [
  {
    name: "পাঙ্গাসী ইউনিয়ন",
    villages: [
      "হাটপাঙ্গাসী",
      "শ্রীদাসগাতী",
      "দেউলমুড়া",
      "মিরের দেউলমুড়া",
      "হাটকান্দা",
      "রাশ্বেরগাতী",
      "মিত্র তেঘুরী",
      "মাটিকোড়া",
      "মনোহরপুর",
      "ব্রাহ্মনবাড়ীয়া",
      "বৈকুন্ঠপুর",
      "বেংনাই",
      "নিজামগাতী",
      "নারুয়া",
      "নারায়নশালুয়া",
      "নওদাশালুয়া",
      "নওদাডুমুর",
      "ডাঙ্গারপাড়া",
      "চড়িয়াগাতী",
      "চকনুর",
      "চক আনারডুমুর",
      "গ্রামপাঙ্গাসী",
      "গঙ্গারামপুর",
      "কৃষ্ণদিয়া",
      "কালিঞ্জা",
      "কয়াবিল"
    ]
  }
];

export const VILLAGES = UNIONS.flatMap(u => u.villages);

export type Gender = "Male" | "Female";

export interface Voter {
  id?: string;
  serial_no?: string;
  name: string;
  voter_no: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  gender: Gender;
  village: string;
  union_name?: string;
  created_at?: string;
}
