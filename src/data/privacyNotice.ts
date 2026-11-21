export type NoticeLanguage = 'en' | 'zu' | 'xh' | 'af' | 'st';

export const NOTICE_LANGUAGE_LABELS: Record<NoticeLanguage, string> = {
  en: 'English',
  zu: 'isiZulu',
  xh: 'isiXhosa',
  af: 'Afrikaans',
  st: 'Sesotho',
};

export interface Layer1NoticeCopy {
  heading: string;
  intro: string;
  whatIUseLabel: string;
  whatIUseBody: string;
  whyLabel: string;
  whyBody: string;
  privacyLabel: string;
  privacyBody: string;
  choiceLabel: string;
  choiceBody: string;
  emergencyLine: string;
  ageCheckbox: string;
  consentCheckbox: string;
  learnMore: string;
  startButton: string;
}

export const LAYER1_NOTICE: Record<NoticeLanguage, Layer1NoticeCopy> = {
  en: {
    heading: 'Before we start',
    intro:
      "Hi, I'm Thuso, an AI support companion (not a human, and not a replacement for a licensed therapist).",
    whatIUseLabel: 'What I use:',
    whatIUseBody:
      "only what you type here. Please don't share your full name, ID number, or address.",
    whyLabel: 'Why:',
    whyBody: 'to talk with you and point you to support.',
    privacyLabel: 'Privacy:',
    privacyBody:
      'your chat is not saved on our servers—it stays only on this device while you use it. You can delete it any time with the "Delete my chat" button.',
    choiceLabel: 'Your choice:',
    choiceBody: 'you can stop at any time.',
    emergencyLine:
      'In an emergency, call 10111 or 112, or SADAG on 0800 567 567.',
    ageCheckbox:
      "I'm 18 or older, or a parent/guardian has said it's okay for me to be here.",
    consentCheckbox: "I've read and agree to how my information is used.",
    learnMore: 'Learn more',
    startButton: 'Start chatting',
  },
  zu: {
    heading: 'Ngaphambi kokuba siqale',
    intro:
      'Sawubona, nginguThuso, umsizi we-AI wokusekela (angiyena umuntu, futhi angithathi indawo kadokotela noma umeluleki oqeqeshiwe).',
    whatIUseLabel: 'Engikusebenzisayo:',
    whatIUseBody:
      'kuphela lokho okubhalayo lapha. Sicela ungabelani ngegama lakho eligcwele, inombolo kamazisi (ID), noma ikheli.',
    whyLabel: 'Kungani:',
    whyBody: 'ukukhuluma nawe nokukukhomba lapho ungathola khona usizo.',
    privacyLabel: 'Ubumfihlo:',
    privacyBody:
      'ingxoxo yakho ayigcinwa kumaseva ethu—ihlala kule divayisi kuphela. Ungayisusa noma nini ngenkinobho ethi "Delete my chat".',
    choiceLabel: 'Ukuzikhethela kwakho:',
    choiceBody: 'ungama noma nini lapho uthanda khona.',
    emergencyLine:
      'Esimeni esiphuthumayo, shayela ku-10111 noma ku-112, noma i-SADAG ku-0800 567 567.',
    ageCheckbox:
      'Ngineminyaka engu-18 noma ngaphezulu, noma umzali/umbheki wami uvumile ukuthi ngibe lapha.',
    consentCheckbox:
      'Ngikufundile futhi ngiyavuma ukuthi ulwazi lwami lusetshenziswe kanjani.',
    learnMore: 'Funda kabanzi',
    startButton: 'Qala ukuxoxa',
  },
  xh: {
    heading: 'Phambi kokuba siqale',
    intro:
      'Molo, ndinguThuso, iqabane le-AI lokuxhasa (andingomntu, kwaye andithathi ndawo yamcebisi okanye ugqirha oqeqeshiweyo).',
    whatIUseLabel: 'Endikusebenzisayo:',
    whatIUseBody:
      'kuphela oko ukubhalayo apha. Nceda ungabelani ngegama lakho elipheleleyo, inombolo yesazisi (ID), okanye idilesi.',
    whyLabel: 'Kutheni:',
    whyBody: 'ukuthetha nawe nokukwalathisa kwinkxaso.',
    privacyLabel: 'Ubumfihlo:',
    privacyBody:
      'incoko yakho ayigcinwa kwiiseva zethu—ihlala kwesi sixhobo kuphela. Ungayicima nanini na ngeqhosha elithi "Delete my chat".',
    choiceLabel: 'Ukhetho lwakho:',
    choiceBody: 'unokuyeka nanini na.',
    emergencyLine:
      'Kwimeko engxamisekileyo, tsalela u-10111 okanye u-112, okanye i-SADAG ku-0800 567 567.',
    ageCheckbox:
      'Ndineminyaka eli-18 okanye ngaphezulu, okanye umzali/umgcini uvumile ukuba ndibekho apha.',
    consentCheckbox:
      'Ndifundile kwaye ndiyavuma indlela olusetyenziswa ngayo ulwazi lwam.',
    learnMore: 'Funda ngakumbi',
    startButton: 'Qala ukuncokola',
  },
  af: {
    heading: 'Voor ons begin',
    intro:
      'Hallo, ek is Thuso, ’n KI-ondersteuningsmetgesel (nie ’n mens nie, en nie ’n plaasvervanger vir ’n gelisensieerde terapeut nie).',
    whatIUseLabel: 'Wat ek gebruik:',
    whatIUseBody:
      'net wat jy hier tik. Moet asseblief nie jou volle naam, ID-nommer of adres deel nie.',
    whyLabel: 'Hoekom:',
    whyBody: 'om met jou te praat en jou na ondersteuning te verwys.',
    privacyLabel: 'Privaatheid:',
    privacyBody:
      'jou gesprek word nie op ons bedieners gestoor nie—dit bly net op hierdie toestel. Jy kan dit enige tyd uitvee met die "Delete my chat"-knoppie.',
    choiceLabel: 'Jou keuse:',
    choiceBody: 'jy kan enige tyd ophou.',
    emergencyLine:
      'In ’n noodgeval, skakel 10111 of 112, of SADAG by 0800 567 567.',
    ageCheckbox:
      'Ek is 18 of ouer, of ’n ouer/voog het gesê dit is reg dat ek hier is.',
    consentCheckbox:
      'Ek het gelees en stem saam oor hoe my inligting gebruik word.',
    learnMore: 'Lees meer',
    startButton: 'Begin gesels',
  },
  st: {
    heading: 'Pele re qala',
    intro:
      'Dumela, ke Thuso, molekane wa AI wa tshehetso (ha ke motho, mme ha ke nke sebaka sa setsebi sa kelello se ngodisitsweng).',
    whatIUseLabel: 'Seo ke se sebedisang:',
    whatIUseBody:
      'feela seo o se ngolang mona. Ka kopo o se ke wa fana ka lebitso la hao le felletseng, nomoro ya ID, kapa aterese.',
    whyLabel: 'Hobaneng:',
    whyBody: 'ho bua le wena le ho o lebisa thusong.',
    privacyLabel: 'Lekunutu:',
    privacyBody:
      'moqoqo wa hao ha o bolokwe disevereng tsa rona—o dula sesebedisweng sena feela. O ka o hlakola neng kapa neng ka konopo ya "Delete my chat".',
    choiceLabel: 'Kgetho ya hao:',
    choiceBody: 'o ka emisa neng kapa neng.',
    emergencyLine:
      'Maemong a tshohanyetso, letsa 10111 kapa 112, kapa SADAG ho 0800 567 567.',
    ageCheckbox:
      'Ke na le dilemo tse 18 kapa ho feta, kapa motswadi/mohlokomedi o dumetse hore ke be mona.',
    consentCheckbox:
      'Ke badile mme ke dumela kamoo tlhahisoleseding ya ka e sebediswang kateng.',
    learnMore: 'Ithute haholwanyane',
    startButton: 'Qala ho bua',
  },
};

export interface Layer2Section {
  label: string;
  body: string;
}

export const LAYER2_FULL_NOTICE: {
  title: string;
  subtitle: string;
  sections: Layer2Section[];
} = {
  title: 'Full Privacy & POPIA Notice',
  subtitle:
    'Plain-language summary of how Thuso handles your information under South Africa’s Protection of Personal Information Act (POPIA).',
  sections: [
    {
      label: 'Who we are',
      body: 'Thuso Community Support Project is the responsible party under POPIA. Before public launch, update this notice with your registered organisation name, public contact email, and registered Information Officer name and email, and have a South African attorney review it.',
    },
    {
      label: 'What we process',
      body: 'Only the messages you type in the chat. Because conversations may touch on health, substance use, or involvement in crime, we treat them as special personal information and collect as little as possible. We ask you not to share identifying details, and our server automatically masks SA ID numbers, phone numbers, email addresses, street addresses, and self-introduced names before processing or audit logging.',
    },
    {
      label: 'Why we process it',
      body: 'Only to provide this supportive conversation and help keep you safe. We never use your chats for marketing, profiling, or advertising, and we never sell them.',
    },
    {
      label: 'Who else handles it',
      body: 'Google Cloud / Gemini processes your masked messages for us as our technical operator under Google Cloud data processing terms. Some AI processing may take place outside South Africa (including European or global Google Cloud regions), with technical and contractual safeguards in place as required by POPIA section 72.',
    },
    {
      label: 'How long we keep it',
      body: 'No chats are stored in a server database. Your conversation history and saved small steps stay only in your browser on this device and are permanently deleted immediately whenever you click "Delete my chat" or clear your browser storage.',
    },
    {
      label: 'Your rights',
      body: 'You may ask to see what we hold about you (which is none on our servers), correct it, or delete it, and you may withdraw consent at any time. Use the "Delete my chat" button at the top of the chat to erase local session data immediately.',
    },
    {
      label: 'Keeping you safe',
      body: 'If you tell us you or someone else is in danger, we immediately display verified South African emergency contacts. We do not contact police, family members, or anyone else on your behalf.',
    },
    {
      label: 'If something goes wrong',
      body: 'If your information is ever compromised in a security incident, we will notify you and the Information Regulator as required by POPIA.',
    },
    {
      label: 'Complaints',
      body: 'You have the right to lodge a complaint with the Information Regulator of South Africa. Please verify current contact details on the official website: inforegulator.org.za.',
    },
  ],
};
