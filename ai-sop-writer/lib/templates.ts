import type { ContentEntry, FaqItem } from "./content";

const LASTMOD = "2026-11-24";

const SHARED_FAQS: FaqItem[] = [
  {
    question: "Can I read and use this template without signing up?",
    answer:
      "Yes. The full template is on this page. Generating a draft is free. Emailing yourself a copy is optional, so there is no email gate.",
  },
  {
    question: "Can I save this as Word or PDF?",
    answer:
      "Yes. Use your browser's print dialog and choose Save as PDF. The optional email sends a Word-ready HTML file and a Markdown file. Open the HTML in Word if you want to edit it there.",
  },
];

function template(
  entry: Omit<
    ContentEntry,
    "type" | "parent" | "lastmod" | "changefreq" | "priority" | "index"
  >,
): ContentEntry {
  return {
    type: "template",
    parent: "/sop-templates",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    ...entry,
    faqs: [...(entry.faqs ?? []), ...SHARED_FAQS],
  };
}

export const TEMPLATES: ContentEntry[] = [
  template({
    path: "/sop-templates/restaurant-sop-template",
    slug: "restaurant-sop-template",
    keyword: "Restaurant SOP Template",
    heading: "Restaurant SOP Template",
    topicLabel: "restaurant",
    description:
      "Free restaurant SOP template for opening, closing, receiving, and cleaning. Read the kitchen opening steps here, then write yours with the AI Writer.",
    industry: "Restaurant",
    templateGroup: "industry",
    mcTag: "tpl-restaurant",
    lede:
      "A restaurant runs on a handful of short procedures, not a binder nobody opens. This template is the kitchen opening SOP, written so a new opener can follow it on the line.",
    purpose:
      "Open the kitchen the same way every service day so stations are set, temperatures are logged, and the first ticket is not the moment the team discovers what is missing.",
    scope:
      "Kitchen opening on a service day. Closing, bar inventory, and payroll are separate SOPs. Use the variants above when you want a front-of-house close or a receiving draft instead.",
    roles: ["Kitchen manager (accountable)", "Opening cook", "Station cooks"],
    records:
      "Keep the opening temperature log, the signed line check, the 86 list, and the handoff note from the night before. The kitchen manager signs before the doors open.",
    reviewCadence:
      "Review when the menu, the equipment, or the open time changes, and at least every six months with the people who open.",
    customize: [
      "Your real open time and who holds the keys",
      "Station cards for the stations you actually run",
      "The temperature limits you were given for your kitchen",
      "Allergens that are on your menu, written where servers can see them",
    ],
    sections: [
      {
        heading: "The first SOPs to write",
        body: [
          "Start with six short SOPs: opening, closing, receiving, cleaning, allergens, and cash. One task per SOP. A new hire can learn opening without reading the whole building. The table below is kitchen opening. Switch the writer for front-of-house closing or receiving deliveries.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Read the handoff before touching a station",
        owner: "Kitchen manager",
        standard: "Last night's notes are acknowledged before prep starts",
      },
      {
        step: "Walk the line and turn equipment on",
        owner: "Opening cook",
        standard: "Coolers, ovens, and gas are on and holding before food comes out",
      },
      {
        step: "Log opening temperatures",
        owner: "Opening cook",
        standard: "Each unit is written down and compared with the limit you set for that kitchen",
      },
      {
        step: "Check pars and the prep list",
        owner: "Opening cook",
        standard: "Short prep is flagged before the doors open",
      },
      {
        step: "Set each station to its station card",
        owner: "Station cook",
        standard: "Tools, labels, and backup pans match the card",
      },
      {
        step: "Update the allergen and 86 list",
        owner: "Kitchen manager",
        standard: "Anything you cannot sell is written where the floor can see it",
      },
      {
        step: "Sign the line check",
        owner: "Kitchen manager",
        standard: "The line check is signed before the first ticket",
      },
    ],
    checklist: [
      "Handoff note read",
      "Equipment on and holding",
      "Opening temperatures logged",
      "Pars and prep list checked",
      "Stations set to the card",
      "Allergen and 86 list current",
      "Line check signed before doors open",
    ],
    exceptions: [
      "A cooler is out of range: move product to a working unit, mark the unit out of service, and tell the manager before service. Do not guess.",
      "A delivery arrives during opening: receive it on the receiving SOP. Do not leave it on the floor.",
      "The key holder is late: the backup opener runs the same checklist, including the temperature log.",
      "The team is short: cut the menu to what you can cook and 86 the rest before the doors open.",
    ],
    prefill: {
      businessType: "Restaurant",
      processName: "Kitchen opening",
      role: "Kitchen manager",
      tools: "Line checklist, probe thermometer, prep list, handoff log",
      kpi: "Line check done before doors open",
      trigger: "First shift arrives",
    },
    variants: [
      {
        label: "Kitchen opening",
        prefill: {
          businessType: "Restaurant",
          processName: "Kitchen opening",
          role: "Kitchen manager",
          tools: "Line checklist, probe thermometer, prep list, handoff log",
          kpi: "Line check done before doors open",
          trigger: "First shift arrives",
        },
      },
      {
        label: "Front of house closing",
        prefill: {
          businessType: "Restaurant",
          processName: "Front of house closing",
          role: "Closing manager",
          tools: "Closing checklist, drawer, sidework list",
          kpi: "Floor reset and drawer counted before the last person leaves",
          trigger: "Last guest leaves",
        },
      },
      {
        label: "Receiving deliveries",
        prefill: {
          businessType: "Restaurant",
          processName: "Receiving deliveries",
          role: "Kitchen manager",
          tools: "Invoice, probe thermometer, storage labels",
          kpi: "Invoice matches the order and food is stored at the logged temperature",
          trigger: "Delivery arrives",
        },
      },
    ],
    related: [
      "opening-and-closing-procedures",
      "customer-service-sop-template",
      "hr-sop-template",
    ],
    faqs: [
      {
        question: "How many SOPs does a restaurant need?",
        answer:
          "Start with the jobs that break service when they are skipped: opening, closing, receiving, cleaning, allergens, and cash. Six short SOPs beat one manual nobody finishes.",
      },
      {
        question: "Should each task be its own SOP?",
        answer:
          "Yes. One task per SOP. Opening is not also receiving. A new hire should be able to learn one job without reading the whole building.",
      },
      {
        question: "How do I train new hires on these?",
        answer:
          "Walk the SOP during a real opening. They do the step, you watch, then they sign your training record. Handing someone a PDF is not training.",
      },
      {
        question: "What should the allergen step say?",
        answer:
          "Name the allergens on your menu and where the team records an 86. Adapt those checks to your menu and to your local requirements. This template does not certify a kitchen.",
      },
    ],
  }),
  template({
    path: "/sop-templates/cleaning-business-sop-template",
    slug: "cleaning-business-sop-template",
    keyword: "Cleaning Business SOP Template",
    heading: "Cleaning Business SOP Template",
    topicLabel: "cleaning business",
    description:
      "Free cleaning business SOP template for home, office, and move-out jobs. Read the room-by-room steps here, then draft your crew version with the AI Writer.",
    industry: "Cleaning",
    templateGroup: "industry",
    mcTag: "tpl-cleaning",
    lede:
      "A cleaning crew does not need a speech about quality. They need the order of the job, from the booking note to the walkthrough. This is that SOP for a standard home clean.",
    purpose:
      "Finish a scheduled clean the same way every time so the client walkthrough has nothing left to call back about.",
    scope:
      "A scheduled residential clean from arrival to sign-off. Office nights and move-out cleans use the same shape with a different room list. Switch the writer to draft those.",
    roles: ["Crew lead (accountable)", "Cleaners", "Office (booking and access notes)"],
    records:
      "Keep the job note, arrival time, photos the client asked for, any damage note, and the walkthrough sign-off. The crew lead closes the job before the next stop.",
    reviewCadence:
      "Review after a callback pattern shows up, when you add a service, and at least every six months with a crew lead.",
    customize: [
      "Your room order for the homes you actually clean",
      "Products you stock, named as they appear on the label",
      "How you get keys, codes, and alarm notes",
      "What a callback means and who owns the return visit",
    ],
    sections: [
      {
        heading: "The path of one job",
        body: [
          "Booking note, arrival, room-by-room work, walkthrough, photos, keys, and a damage note if you need one. Work top to bottom and clean to dirty so the crew is not recleaning the floor they just finished.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Read the job note before leaving the vehicle",
        owner: "Crew lead",
        standard: "Access, pets, products to skip, and extras are known before anyone enters",
      },
      {
        step: "Arrive, protect the entry, and confirm the scope",
        owner: "Crew lead",
        standard: "The client or the note matches the rooms you are there to clean",
      },
      {
        step: "Clean top to bottom, clean to dirty",
        owner: "Cleaners",
        standard: "Each room is finished before the crew moves to the next, in the order on the job card",
      },
      {
        step: "Use the labeled product for that surface",
        owner: "Cleaners",
        standard: "Follow the label and the SDS for the product in your caddy. Do not substitute from memory",
      },
      {
        step: "Walk the job against the checklist",
        owner: "Crew lead",
        standard: "Missed items are fixed before anyone calls it done",
      },
      {
        step: "Take the photos the job note asks for",
        owner: "Crew lead",
        standard: "Photos match the rooms in the note and are attached to the job before you leave",
      },
      {
        step: "Return keys, reset the alarm, and log damage",
        owner: "Crew lead",
        standard: "Access is left as you found it, and any damage is written down the same day",
      },
    ],
    checklist: [
      "Job note read before entry",
      "Scope confirmed",
      "Rooms done in card order",
      "Products match the label in the caddy",
      "Walkthrough complete",
      "Photos attached when the note asks for them",
      "Keys and alarm reset",
      "Damage or a callback risk written on the job",
    ],
    exceptions: [
      "The home is not empty and the scope changes: stop, confirm the new scope, and write it on the job before you continue.",
      "A product the client forbids is the one you brought: skip that surface and note it. Do not improvise a mix.",
      "You find damage you did not cause: photograph it and tell the office the same day, before the next clean.",
      "A client calls back: the crew lead who ran the job, or the backup lead, returns against the original checklist. Log what was missed.",
    ],
    prefill: {
      businessType: "Residential cleaning company",
      processName: "Standard home clean",
      role: "Crew lead",
      tools: "Job card, caddy, labels, photo phone, key log",
      kpi: "Client sign-off with no callbacks",
      trigger: "Job scheduled for today",
    },
    variants: [
      {
        label: "Residential",
        prefill: {
          businessType: "Residential cleaning company",
          processName: "Standard home clean",
          role: "Crew lead",
          tools: "Job card, caddy, labels, photo phone, key log",
          kpi: "Client sign-off with no callbacks",
          trigger: "Job scheduled for today",
        },
      },
      {
        label: "Commercial office",
        prefill: {
          businessType: "Commercial cleaning company",
          processName: "Nightly office clean",
          role: "Crew lead",
          tools: "Scope sheet, caddy, alarm code, photo phone",
          kpi: "Office ready before the client opens",
          trigger: "Building access window starts",
        },
      },
      {
        label: "Move-out",
        prefill: {
          businessType: "Residential cleaning company",
          processName: "Move-out clean",
          role: "Crew lead",
          tools: "Empty-unit checklist, caddy, photo phone",
          kpi: "Empty unit ready for the walkthrough",
          trigger: "Tenant has vacated",
        },
      },
    ],
    related: [
      "customer-service-sop-template",
      "employee-onboarding-sop-template",
      "property-management-sop-template",
    ],
    faqs: [
      {
        question: "What should the SOP say about chemicals?",
        answer:
          "Name the product in the caddy and tell the crew to follow the label and the SDS. Leave mixing advice off the SOP. A generic recipe is how someone gets hurt or ruins a surface.",
      },
      {
        question: "How does this work when the crew has new hires?",
        answer:
          "The crew lead runs the checklist out loud on the first jobs. The new hire does one room, the lead checks it, then they take the next room. Put that expectation in onboarding so day one is not a silent ride-along.",
      },
      {
        question: "How should we handle callbacks?",
        answer:
          "Write who owns the return visit, how fast they go back, and what gets logged. A callback without a note becomes a story. A callback with the checklist item that failed becomes a training fix.",
      },
    ],
  }),
  template({
    path: "/sop-templates/employee-onboarding-sop-template",
    slug: "employee-onboarding-sop-template",
    keyword: "Employee Onboarding SOP Template",
    heading: "Employee Onboarding SOP Template",
    topicLabel: "employee onboarding",
    description:
      "Free employee onboarding SOP template from offer accepted through the first week. Read the steps on the page, then draft your version with the AI Writer.",
    industry: "People",
    templateGroup: "function",
    mcTag: "tpl-employee-onboarding",
    lede:
      "Onboarding is the work between a signed offer and a person who can do the job. This template names who sets up accounts, who meets them on day one, and what done looks like before the first week ends.",
    purpose:
      "Have accounts, equipment, and a first-week plan ready before day one so a new hire is not collecting logins in a group chat.",
    scope:
      "A new hire at a small operating company, from offer accepted through the 30/60/90 check-ins. Orientation, the tour and the introductions, sits inside day one. It is not the whole SOP.",
    roles: ["Hiring manager (accountable)", "Office manager", "Buddy", "New hire"],
    records:
      "Keep the offer date, the account checklist, equipment issued, the buddy's name, and the dates of the 30/60/90 check-ins. The hiring manager closes the record after the first check-in.",
    reviewCadence:
      "Review when you change tools or the first-week plan, and after any start where day one was spent waiting on access.",
    customize: [
      "The accounts your jobs actually need, and who creates each one",
      "Paperwork you collect before day one, adapted to your local requirements",
      "The buddy's job: what they show, and what they do not decide",
      "What the 30, 60, and 90 day conversations are for",
    ],
    sections: [
      {
        heading: "Onboarding is the process, orientation is one day",
        body: [
          "Orientation is the welcome, the tour, and the introductions. Onboarding is the longer path: paperwork before the start, accounts and equipment, a first-week plan, a buddy, and check-ins. Write both, and do not pretend the welcome lunch finished the job.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Open the hire record when the offer is accepted",
        owner: "Hiring manager",
        standard: "Start date, role, and manager are written down the day the offer is accepted",
      },
      {
        step: "Collect pre-start paperwork",
        owner: "Office manager",
        standard: "Forms you require are requested with enough time to finish them before day one. Adapt the list to your local requirements",
      },
      {
        step: "Create accounts and stage equipment",
        owner: "Office manager",
        standard: "Email, tools, and equipment are ready before the first morning, not during it",
      },
      {
        step: "Send the first-week plan",
        owner: "Hiring manager",
        standard: "The new hire can see who they meet and what they are learning each day",
      },
      {
        step: "Assign a buddy and run day one",
        owner: "Hiring manager",
        standard: "Someone named, other than the manager, is available for the practical questions",
      },
      {
        step: "Hold the 30, 60, and 90 day check-ins",
        owner: "Hiring manager",
        standard: "Each check-in has a date on the calendar before day one, and a note afterward",
      },
      {
        step: "Close the onboarding record",
        owner: "Hiring manager",
        standard: "Accounts, equipment, and the first check-in are marked done or explicitly still open",
      },
    ],
    checklist: [
      "Offer accepted and start date confirmed",
      "Pre-start paperwork requested",
      "Accounts created before day one",
      "Equipment staged",
      "First-week plan sent",
      "Buddy named",
      "30/60/90 dates on the calendar",
      "Record closed or open items listed",
    ],
    exceptions: [
      "The start date moves: redo the account timing. Do not leave live access sitting unused with no new date.",
      "A background or paperwork step is still open: say what the person can and cannot do on day one. Do not pretend it is finished.",
      "The hiring manager is out: name the backup before the start date, in the record.",
      "The hire is remote: ship equipment to arrive before day one, and put the first meeting link in the plan.",
    ],
    prefill: {
      businessType: "Small operating company",
      processName: "New hire onboarding",
      role: "Hiring manager",
      tools: "Offer letter, account checklist, equipment list, calendar",
      kpi: "Accounts ready before day one",
      trigger: "Offer accepted",
    },
    related: [
      "hr-sop-template",
      "payroll-sop-template",
      "virtual-assistant-sop-template",
    ],
    faqs: [
      {
        question: "What is the difference between onboarding and orientation?",
        answer:
          "Orientation is the first-day welcome. Onboarding is the whole path from the accepted offer through the early check-ins. If you only write orientation, week two is still tribal knowledge.",
      },
      {
        question: "What should an onboarding SOP include?",
        answer:
          "Pre-start paperwork, accounts, equipment, a first-week plan, a buddy, and dated check-ins. Leave the employee handbook as the policy. This SOP is the procedure for getting someone ready to work.",
      },
      {
        question: "How is a remote hire different?",
        answer:
          "Equipment has to arrive before day one, and the first meetings need links, not a desk. The checklist is the same. The timing is earlier because shipping and access cannot be fixed in the hallway.",
      },
    ],
  }),
  template({
    path: "/sop-templates/property-management-sop-template",
    slug: "property-management-sop-template",
    keyword: "Property Management SOP Template",
    heading: "Property Management SOP Template",
    topicLabel: "property management",
    description:
      "Free property management SOP template for move-in, maintenance, and move-out. Read the move-in steps on the page, then draft yours with the AI Writer.",
    industry: "Property management",
    templateGroup: "industry",
    mcTag: "tpl-property-management",
    lede:
      "Property management breaks in the handoffs: keys, condition, and who owns a repair. This template is the tenant move-in, from an approved lease to a signed condition report.",
    purpose:
      "Hand over keys only after the condition of the unit is written down and signed, so move-out is a comparison and not a debate.",
    scope:
      "A residential move-in. Maintenance triage and move-out are separate SOPs. Switch the writer to draft those. Rent collection and owner reporting belong on their own pages when you write them.",
    roles: ["Property manager (accountable)", "Leasing agent", "Maintenance lead"],
    records:
      "Keep the approved lease, the condition report with photos, the key or access log, and the utility start note. The property manager signs the file before the keys go out.",
    reviewCadence:
      "Review when your lease or condition form changes, and at least once a year with the people who run move-ins.",
    customize: [
      "Your condition form and the photos you always take",
      "Deposit handling, written to match the rules where the property sits",
      "Who can approve a repair found during the walkthrough",
      "The software you use for the file. The steps should still make sense if you switch tools",
    ],
    sections: [
      {
        heading: "The core SOP list",
        body: [
          "A small portfolio needs move-in, move-out, maintenance triage, rent follow-up, inspections, and owner reporting. Write them as separate SOPs. The table below is move-in. The steps name the work, not a specific software product.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Confirm the lease is approved and the unit is ready",
        owner: "Property manager",
        standard: "The file shows an approved lease and a unit that matches what was shown",
      },
      {
        step: "Walk the unit and complete the condition report",
        owner: "Property manager",
        standard: "Every room on the form has a note and the photos you require",
      },
      {
        step: "Review the report with the tenant",
        owner: "Property manager",
        standard: "The tenant has time to add items before anyone signs",
      },
      {
        step: "Sign the condition report",
        owner: "Property manager",
        standard: "Both signatures are on the report before keys are handed over",
      },
      {
        step: "Record keys, codes, and utility start",
        owner: "Leasing agent",
        standard: "Access issued and utility start are written on the file the same day",
      },
      {
        step: "Log any repair found on the walkthrough",
        owner: "Maintenance lead",
        standard: "A repair is a work order with an owner, not a verbal promise",
      },
      {
        step: "File the packet and set the first inspection",
        owner: "Property manager",
        standard: "The packet is stored where the move-out lead will find it",
      },
    ],
    checklist: [
      "Lease approved",
      "Unit walked",
      "Condition report complete with photos",
      "Tenant additions written down",
      "Report signed before key handoff",
      "Keys and utility start logged",
      "Walkthrough repairs on a work order",
      "Packet filed",
    ],
    exceptions: [
      "The unit is not ready on the start date: do not hand over keys against a report that describes a different condition. Reset the date and say so in writing.",
      "The tenant refuses to sign: note the refusal, leave a copy, and follow the process you use for an unsigned report. Do not skip the photos.",
      "A repair is found that makes the unit unusable: stop the handoff and put the repair on a work order before you pick a new date.",
      "Deposit questions come up on the walkthrough: point to the lease terms you already use. Adapt deposit steps to the rules where the property sits.",
    ],
    prefill: {
      businessType: "Residential property management company",
      processName: "Tenant move-in",
      role: "Property manager",
      tools: "Lease file, condition report, camera, key log",
      kpi: "Condition report signed before key handoff",
      trigger: "Lease approved",
    },
    variants: [
      {
        label: "Move-in",
        prefill: {
          businessType: "Residential property management company",
          processName: "Tenant move-in",
          role: "Property manager",
          tools: "Lease file, condition report, camera, key log",
          kpi: "Condition report signed before key handoff",
          trigger: "Lease approved",
        },
      },
      {
        label: "Maintenance request",
        prefill: {
          businessType: "Residential property management company",
          processName: "Maintenance request",
          role: "Property manager",
          tools: "Work order, tenant notice template, vendor list",
          kpi: "Work order assigned the same business day",
          trigger: "Tenant reports a repair",
        },
      },
      {
        label: "Move-out",
        prefill: {
          businessType: "Residential property management company",
          processName: "Tenant move-out",
          role: "Property manager",
          tools: "Move-in condition report, camera, key log",
          kpi: "Condition compared with the move-in report the same day",
          trigger: "Notice period ends",
        },
      },
    ],
    related: [
      "customer-service-sop-template",
      "cleaning-business-sop-template",
      "opening-and-closing-procedures",
    ],
    faqs: [
      {
        question: "How should deposits show up in the SOP?",
        answer:
          "Write the steps your team already follows, then adapt them to the rules where the property sits. This template does not set a deposit amount or a deadline. Confirm those before you train anyone.",
      },
      {
        question: "Does this assume a certain property software?",
        answer:
          "No. The steps are the walkthrough, the report, the keys, and the file. Put your screen names in the tools field when you generate a draft. The procedure should still be readable if you change software.",
      },
      {
        question: "Which SOP should I write after move-in?",
        answer:
          "Move-out, because it uses this condition report, and maintenance triage, because that is the next call you will get. Rent follow-up and owner reporting come after those three are real.",
      },
    ],
  }),
  template({
    path: "/sop-templates/opening-and-closing-procedures",
    slug: "opening-and-closing-procedures",
    keyword: "Opening and Closing Procedures",
    heading: "Opening and Closing Procedures",
    topicLabel: "opening and closing",
    description:
      "Free opening and closing procedures for retail, restaurants, and front desks. Read the checklists, cash count, and handoff log, then draft yours.",
    industry: "Operations",
    templateGroup: "function",
    mcTag: "tpl-opening-closing",
    lede:
      "Opening and closing fail when they live in one person's head. This page splits them into two checklists and shows a store closing you can copy, including the cash count and the handoff log.",
    purpose:
      "Close the store so the drawer is balanced, the building is secured, and the next opener can see what happened without a text message.",
    scope:
      "Retail store closing, with an opening checklist beside it. Restaurant open and close, and an office front desk, are variants in the writer. Cash handling details belong in this close, not in a separate speech.",
    roles: ["Shift manager (accountable)", "Closing associate", "Opening associate"],
    records:
      "Keep the opening checklist, the closing checklist, the drawer count, the deposit slip if you drop one, and the handoff log. The shift manager signs the close.",
    reviewCadence:
      "Review when hours, the alarm, or the drawer process changes, and after any close that the next opener could not follow.",
    checklistLabel: "Closing checklist",
    extraLists: [
      {
        heading: "Opening checklist",
        items: [
          "Alarm off and lights on, logged",
          "Building walk: doors, restrooms, and sales floor checked",
          "Safe opened by two people if that is your rule",
          "Drawer counted in and the amount written down",
          "Systems and card reader online",
          "Handoff log from last night read before the door is unlocked",
        ],
      },
    ],
    customize: [
      "Who may open, who may close, and who holds alarm codes",
      "Your drawer count: one person or two, and the variance you will accept",
      "What 'building secured' means for your doors, safe, and lights",
      "The three things the next shift must see in the handoff log",
    ],
    sections: [
      {
        heading: "One checklist or two",
        body: [
          "Use two. Opening and closing are different jobs with different risks. The list above is opening. The table and the closing checklist are the close, which is the prefilled draft. A printable version is the same content: print this page or email yourself the Word-ready file.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Announce the close and finish the last customer",
        owner: "Shift manager",
        standard: "The door is locked only after the last customer has left",
      },
      {
        step: "Count the drawer",
        owner: "Closing associate",
        standard: "The count is written down and a second person checks it when your rule says so",
      },
      {
        step: "Record the variance and the deposit",
        owner: "Shift manager",
        standard: "A difference is noted the same night, not discovered at the bank",
      },
      {
        step: "Reset the floor and the register for the open",
        owner: "Closing associate",
        standard: "The opening drawer fund is in place and the floor matches the opening checklist",
      },
      {
        step: "Secure the building",
        owner: "Shift manager",
        standard: "Doors, safe, and alarm match your close standard before anyone leaves",
      },
      {
        step: "Write the handoff log",
        owner: "Shift manager",
        standard: "The opener can read what broke, what was left, and who to call",
      },
      {
        step: "Sign the close",
        owner: "Shift manager",
        standard: "A named person signs. 'The closer' is not a signature",
      },
    ],
    checklist: [
      "Last customer has left",
      "Drawer counted and written down",
      "Variance noted",
      "Deposit prepared when one is due",
      "Opening fund reset",
      "Floor ready for the open",
      "Doors, safe, and alarm secured",
      "Handoff log written and close signed",
    ],
    exceptions: [
      "The drawer does not balance: recount once, write the variance, and tell the manager the same night. Do not force the numbers.",
      "The alarm will not set: stay with the building and call the person on your call list. Do not leave a store that is not secured.",
      "A customer is still inside at close: finish their sale, then start the checklist. Do not count cash in front of them.",
      "The opener's notes from this morning were wrong: fix the handoff fields so tomorrow's note cannot skip them.",
    ],
    prefill: {
      businessType: "Retail store",
      processName: "Store closing",
      role: "Shift manager",
      tools: "Closing checklist, drawer, alarm, handoff log",
      kpi: "Drawer balanced and building secured",
      trigger: "Last customer leaves",
    },
    variants: [
      {
        label: "Retail closing",
        prefill: {
          businessType: "Retail store",
          processName: "Store closing",
          role: "Shift manager",
          tools: "Closing checklist, drawer, alarm, handoff log",
          kpi: "Drawer balanced and building secured",
          trigger: "Last customer leaves",
        },
      },
      {
        label: "Restaurant opening",
        prefill: {
          businessType: "Restaurant",
          processName: "Restaurant opening",
          role: "Opening manager",
          tools: "Opening checklist, sidework list, handoff log",
          kpi: "Floor and line ready before the door is unlocked",
          trigger: "Opening crew arrives",
        },
      },
      {
        label: "Office front desk",
        prefill: {
          businessType: "Small office",
          processName: "Front desk opening",
          role: "Front desk lead",
          tools: "Opening checklist, visitor log, phone",
          kpi: "Desk covered and messages cleared before the first appointment",
          trigger: "Office opens",
        },
      },
    ],
    related: [
      "restaurant-sop-template",
      "warehouse-sop-template",
      "customer-service-sop-template",
    ],
    faqs: [
      {
        question: "Who signs the open and the close?",
        answer:
          "A named role on that shift. The shift manager signs the close on this template. If you want two signatures on the drawer, write that into the cash step. A checklist with no name is a rumor.",
      },
      {
        question: "Should opening and closing be one checklist?",
        answer:
          "No. They fail in different ways. Keep two checklists and one handoff log that both shifts read. The log is the bridge. The checklists are the work.",
      },
      {
        question: "Can I print this?",
        answer:
          "Yes. Print this page, or email yourself the Word-ready file and print that. A laminated open and a laminated close, with the handoff log on paper or in your system, is enough to start.",
      },
    ],
  }),
  template({
    path: "/sop-templates/customer-service-sop-template",
    slug: "customer-service-sop-template",
    keyword: "Customer Service SOP Template",
    heading: "Customer Service SOP Template",
    topicLabel: "customer service",
    description:
      "Free customer service SOP template for intake, triage, refunds, and escalation. Read the complaint steps on the page, then draft yours with the AI Writer.",
    industry: "Customer service",
    templateGroup: "function",
    mcTag: "tpl-customer-service",
    lede:
      "Customer service gets messy when every person invents a different refund. This SOP is the complaint path: take it in, sort it, respond, and close it with a note.",
    purpose:
      "Acknowledge a complaint within one business day and close it with a decision a teammate can see, so the customer does not have to retell the story.",
    scope:
      "Complaints that arrive by phone, email, or in person at a small business. Scripts are examples of tone. The SOP is who does what. Marketing replies and legal demands are out of scope.",
    roles: ["Customer service lead (accountable)", "Frontline staff", "Owner (escalation)"],
    records:
      "Log the channel, the date, what the customer asked, the decision, who approved a refund or credit, and the date you closed it. The lead reviews open items daily.",
    reviewCadence:
      "Review when you change refund authority, and monthly if the same complaint keeps showing up.",
    customize: [
      "Your triage levels and what each one means",
      "Who can refund, who can credit, and the amount that needs the owner",
      "The channels you actually answer, and the ones you do not",
      "What 'closed' means in your log",
    ],
    sections: [
      {
        heading: "SOP and script are different",
        body: [
          "A script is the sentence. The SOP is the path: intake, triage, authority, escalation, and the log. Write a short example line for phone, email, and in person, then keep the authority in the SOP so a new hire cannot invent a refund.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Log the complaint the day it arrives",
        owner: "Frontline staff",
        standard: "Channel, name, and the request are in the log before the conversation ends",
      },
      {
        step: "Acknowledge within one business day",
        owner: "Frontline staff",
        standard: "The customer has a reply that names the next step, even if the answer is not ready",
      },
      {
        step: "Triage the request",
        owner: "Customer service lead",
        standard: "It is marked simple, needs a make-good, or needs the owner",
      },
      {
        step: "Apply the refund and credit rules",
        owner: "Customer service lead",
        standard: "The decision is inside the authority you wrote down. Anything above it waits for the owner",
      },
      {
        step: "Escalate with the facts",
        owner: "Customer service lead",
        standard: "The owner gets the log, not a retelling from memory",
      },
      {
        step: "Tell the customer the decision",
        owner: "Frontline staff",
        standard: "The reply matches the decision in the log, on the same channel when you can",
      },
      {
        step: "Close the log",
        owner: "Customer service lead",
        standard: "Closed items have a decision, a name, and a date",
      },
    ],
    checklist: [
      "Complaint logged with channel and date",
      "Acknowledged within one business day",
      "Triage level set",
      "Refund or credit inside the written authority",
      "Escalation includes the log",
      "Customer told the decision",
      "Log closed with a name and a date",
    ],
    exceptions: [
      "The same complaint arrives on two channels: keep one log and note both channels. Do not run two decisions.",
      "The customer asks for a refund above the written limit: acknowledge, and send it to the owner. Do not bargain live.",
      "You cannot tell who the customer is: ask for the order or job number before you promise a make-good.",
      "A complaint describes a safety or damage issue: pull it out of the normal queue and tell the owner the same day.",
    ],
    prefill: {
      businessType: "Small business",
      processName: "Customer complaint handling",
      role: "Customer service lead",
      tools: "Shared inbox, complaint log, refund rules",
      kpi: "Acknowledged within 1 business day",
      trigger: "Complaint received by phone, email, or in person",
    },
    related: [
      "restaurant-sop-template",
      "cleaning-business-sop-template",
      "property-management-sop-template",
    ],
    faqs: [
      {
        question: "Is a customer service SOP the same as a script?",
        answer:
          "No. The script is an example of what to say. The SOP says who logs the complaint, who can refund, and when it escalates. Train the path. Let people use their own words inside it.",
      },
      {
        question: "What does this look like on each channel?",
        answer:
          "Phone: log it before you hang up and say when they will hear back. Email: reply within one business day with the next step. In person: write it down before the customer leaves so the desk is not the only copy.",
      },
      {
        question: "Who is allowed to refund?",
        answer:
          "Whoever you name, up to the amount you write in the SOP. Above that, the owner decides. If the amount is not written down, every complaint becomes a negotiation.",
      },
    ],
  }),
  template({
    path: "/sop-templates/warehouse-sop-template",
    slug: "warehouse-sop-template",
    keyword: "Warehouse SOP Template",
    heading: "Warehouse SOP Template",
    topicLabel: "warehouse",
    description:
      "Free warehouse SOP template for receiving, picking, and cycle counts. Read the receiving steps on the page, then draft your version with the AI Writer.",
    industry: "Warehouse",
    templateGroup: "industry",
    mcTag: "tpl-warehouse",
    lede:
      "Receiving is where inventory goes wrong: a truck, a short count, and a pallet with nowhere to go. This SOP takes an inbound shipment from the dock to put-away the same day.",
    purpose:
      "Receive what the order said, record what actually arrived, and put it away the same day so the floor and the system match.",
    scope:
      "Inbound receiving at a distribution warehouse. Picking and packing, and cycle counts, are separate SOPs. Switch the writer to draft them. Safety steps for the dock and for lifting belong in your safety program. Point to that program from this SOP.",
    roles: ["Receiving lead (accountable)", "Receiver", "Inventory clerk"],
    records:
      "Keep the packing list, the count, photos of damage, the discrepancy note, and the put-away location. The receiving lead signs the receipt the same day.",
    reviewCadence:
      "Review when you change the put-away rules or the discrepancy path, and after any week where receipts sat overnight.",
    customize: [
      "Your dock hours and who may accept a truck",
      "What counts as a discrepancy worth holding the line",
      "Location labels the way your floor actually uses them",
      "Which system gets the receipt, by the name your team uses",
    ],
    sections: [
      {
        heading: "SOPs to write around this one",
        body: [
          "Receiving, picking and packing, cycle count, and returns. This page is receiving. A work instruction is the shorter card for one task inside the SOP, such as how to label a pallet. Keep the SOP as the path, and the card as the single task.",
          "When the decision on every truck is accept, hold, or refuse, map that path as a flowchart in Builder Pro so a new receiver can see it beside the steps.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Check the appointment and stage the dock",
        owner: "Receiving lead",
        standard: "The truck on the door matches a purchase order you expect",
      },
      {
        step: "Match the packing list to the order",
        owner: "Receiver",
        standard: "Lines, quantities, and item numbers are compared before product hits the floor",
      },
      {
        step: "Count and inspect",
        owner: "Receiver",
        standard: "Damage and shorts are photographed and written on the receipt",
      },
      {
        step: "Decide accept, hold, or refuse",
        owner: "Receiving lead",
        standard: "The decision is recorded. A hold has a reason and an owner",
      },
      {
        step: "Label and put away",
        owner: "Receiver",
        standard: "Accepted product is in a location the same day, and the location is on the receipt",
      },
      {
        step: "Enter the receipt",
        owner: "Inventory clerk",
        standard: "The system matches the signed count, including discrepancies",
      },
      {
        step: "Close the receipt",
        owner: "Receiving lead",
        standard: "Nothing accepted is still sitting unlabeled at the end of the shift",
      },
    ],
    checklist: [
      "Truck matches an expected order",
      "Packing list compared with the order",
      "Count and damage written down",
      "Accept, hold, or refuse recorded",
      "Put-away location on the receipt",
      "System updated the same day",
      "Receipt signed by the receiving lead",
    ],
    exceptions: [
      "The count is short or over: receive what you counted, write the difference, and hold the line if your rule says the order cannot close. Do not 'fix' the paperwork to match the order.",
      "Product is damaged: photograph it, leave it out of sellable inventory, and name who tells the buyer or the carrier.",
      "There is no purchase order: do not put it away. Park it and call the buyer the same day.",
      "Put-away will miss the end of the shift: say so on the receipt and name who finishes it. Silent overnight pallets are how counts drift.",
    ],
    prefill: {
      businessType: "Distribution warehouse",
      processName: "Receiving inbound shipments",
      role: "Receiving lead",
      tools: "Purchase order, packing list, scanner, location labels",
      kpi: "Received and put away same day",
      trigger: "Truck arrives at dock",
    },
    variants: [
      {
        label: "Receiving",
        prefill: {
          businessType: "Distribution warehouse",
          processName: "Receiving inbound shipments",
          role: "Receiving lead",
          tools: "Purchase order, packing list, scanner, location labels",
          kpi: "Received and put away same day",
          trigger: "Truck arrives at dock",
        },
      },
      {
        label: "Picking and packing",
        prefill: {
          businessType: "Distribution warehouse",
          processName: "Picking and packing an order",
          role: "Warehouse associate",
          tools: "Pick list, scanner, pack station, carrier labels",
          kpi: "Order packed and staged the same day",
          trigger: "Order released to the floor",
        },
      },
      {
        label: "Cycle count",
        prefill: {
          businessType: "Distribution warehouse",
          processName: "Cycle count",
          role: "Inventory lead",
          tools: "Count sheet, scanner, variance log",
          kpi: "Count recorded and variances reviewed the same day",
          trigger: "Count batch assigned",
        },
      },
    ],
    related: [
      "opening-and-closing-procedures",
      "employee-onboarding-sop-template",
      "restaurant-sop-template",
    ],
    faqs: [
      {
        question: "What is the difference between an SOP and a work instruction?",
        answer:
          "The SOP is the path from truck to put-away, including who decides a discrepancy. A work instruction is one task inside it, such as how to print a location label. Write the SOP first. Add cards for the tasks people still get wrong.",
      },
      {
        question: "Where do safety steps belong?",
        answer:
          "Dock, equipment, and lifting steps belong in your safety program. This SOP should point to that program and then cover the count, the decision, and the put-away. Adapt the safety steps to your local requirements.",
      },
      {
        question: "What do I do with a discrepancy?",
        answer:
          "Write the count you actually have, photograph damage, and choose accept, hold, or refuse. Name the person who tells the buyer. Do not adjust the receipt so the purchase order looks perfect.",
      },
    ],
  }),
  template({
    path: "/sop-templates/virtual-assistant-sop-template",
    slug: "virtual-assistant-sop-template",
    keyword: "Virtual Assistant SOP Template",
    heading: "Virtual Assistant SOP Template",
    topicLabel: "virtual assistant",
    description:
      "Free virtual assistant SOP template for inbox and calendar work. Read what a VA may do, what needs approval, and what stays out of the doc, then draft yours.",
    industry: "Operations",
    templateGroup: "function",
    mcTag: "tpl-virtual-assistant",
    lede:
      "A virtual assistant can only run the work you define. This SOP says what they may do with the inbox and calendar, what needs a yes from you, and what they must never do.",
    purpose:
      "Triage the inbox and the calendar by a set time each workday, without the assistant guessing which messages they are allowed to answer.",
    scope:
      "Inbox and calendar management for a small business owner. Bookkeeping, payroll, and customer refunds are out of scope unless you add a separate SOP that names them.",
    roles: ["Owner (accountable)", "Virtual assistant"],
    records:
      "Keep the decision list, the tools the assistant can open, and a short handoff note when they are out. Passwords stay in a password manager. They are not written in this SOP.",
    reviewCadence:
      "Review after the first two weeks, then when you add a tool or a type of email they may answer.",
    customize: [
      "The folders or labels you actually use",
      "Which emails they may answer, and which they only draft",
      "Calendar rules: who they can book, and which hours are off limits",
      "The password manager you use, named once, with no passwords in the document",
    ],
    sections: [
      {
        heading: "May do, needs approval, never do",
        body: [
          "May do: sort the inbox, draft replies you have already approved as a type, propose calendar times inside the hours you set, and file receipts into the folder you named.",
          "Needs approval: send a reply that promises money, time, or a discount; move a meeting the owner is hosting; buy anything.",
          "Never do: share a password in chat, email, or this SOP; pay bills; run payroll; delete mail they did not file.",
          "A short screen recording of the inbox sort is the fastest way to show the clicks. Link the recording from the SOP. Do not paste credentials into the video description.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Open the inbox and the calendar at the start of the day",
        owner: "Virtual assistant",
        standard: "Work starts from the tools list, not from a forwarded password",
      },
      {
        step: "Sort mail into the labels you defined",
        owner: "Virtual assistant",
        standard: "Every new message is in a label before any reply is drafted",
      },
      {
        step: "Draft replies that fit the approved types",
        owner: "Virtual assistant",
        standard: "Drafts stay in draft until the type is on the may-do list",
      },
      {
        step: "Flag anything that needs the owner",
        owner: "Virtual assistant",
        standard: "Money, legal, hiring, and angry customers are flagged, not answered",
      },
      {
        step: "Propose calendar changes inside the rules",
        owner: "Virtual assistant",
        standard: "Holds and bookings match the hours and the meeting types you wrote down",
      },
      {
        step: "Send the daily note",
        owner: "Virtual assistant",
        standard: "By the time you set, the owner can see what was handled and what is waiting",
      },
      {
        step: "Hand off when you are out",
        owner: "Virtual assistant",
        standard: "A note says what is open. Access is not shared by sending passwords",
      },
    ],
    checklist: [
      "Inbox opened from the password manager",
      "New mail labeled",
      "Approved drafts prepared",
      "Owner-only mail flagged",
      "Calendar changes inside the written hours",
      "Daily note sent by the deadline",
      "No passwords in the SOP, the chat, or the note",
    ],
    exceptions: [
      "A message asks for money or a login: do not reply and do not click the link. Flag it.",
      "The owner has not answered a flag by the next start of day: leave it flagged and say so in the daily note. Do not decide it.",
      "A tool login fails: reset it through the password manager. Do not ask the owner to paste a password into chat.",
      "The assistant is out: the handoff note names the open flags. The owner does not share the assistant's password with a substitute.",
    ],
    prefill: {
      businessType: "Small business owner",
      processName: "Inbox and calendar management",
      role: "Virtual assistant",
      tools: "Email, calendar, password manager, task list",
      kpi: "Inbox triaged by 10am",
      trigger: "Start of each workday",
    },
    related: [
      "employee-onboarding-sop-template",
      "customer-service-sop-template",
      "hr-sop-template",
    ],
    faqs: [
      {
        question: "Which tasks should I delegate first?",
        answer:
          "Start with sorting and drafting, not sending. Inbox labels, calendar holds inside rules you wrote, and a daily note are enough for week one. Add sending only after you have seen a week of drafts you would have sent yourself.",
      },
      {
        question: "How detailed should the SOP be?",
        answer:
          "Detailed on decisions, short on clicks. Write the rules: what they may answer, what they flag, and the clock time. Record the clicks once. If the SOP is a tour of every button, it will be wrong the next time the tool moves a menu.",
      },
      {
        question: "Where do passwords go?",
        answer:
          "In a password manager, shared as access to that item. They do not go in the SOP, in email, or in a chat thread. Write the name of the tool. Never write the secret.",
      },
    ],
  }),
  template({
    path: "/sop-templates/hr-sop-template",
    slug: "hr-sop-template",
    keyword: "HR SOP Template",
    heading: "HR SOP Template",
    topicLabel: "HR",
    description:
      "Free HR SOP template for hiring, time off, check-ins, and offboarding. Read the time-off procedure on the page, then draft yours with the AI Writer.",
    industry: "People",
    templateGroup: "function",
    mcTag: "tpl-hr",
    lede:
      "A small company does not need a fake corporate handbook. It needs a short list of HR procedures and one worked example. This page lists the SOPs to write and fills in time-off requests.",
    purpose:
      "Decide a time-off request within two business days so the team can plan coverage and the employee is not left waiting.",
    scope:
      "Time-off requests at a small operating company. The handbook holds the policy: how much time exists and what kind. This SOP is the procedure: who receives the request, who approves it, and where it is written down. Adapt both to your local requirements.",
    roles: ["Office manager (accountable for the log)", "Hiring manager (approves)", "Employee"],
    records:
      "Keep the request, the decision, the dates, and who will cover the work. Store it where payroll and the manager can both see it. Do not keep the only copy in a private inbox.",
    reviewCadence:
      "Review when your time-off policy changes, and before the next busy season when coverage fails.",
    customize: [
      "The kinds of time off you offer, matching the policy you already use",
      "How far ahead a request should arrive",
      "Who approves, and who approves when that person is the one asking",
      "Where the decision is written so payroll can see it",
    ],
    sections: [
      {
        heading: "HR SOPs a small business actually needs",
        body: [
          "Hiring, onboarding, time off, performance check-ins, offboarding, and a records habit. Write the policy in the handbook. Write the steps in the SOP. The table on this page is time off, the request most teams handle every month. Onboarding and payroll have their own templates.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Submit the request in the place you named",
        owner: "Employee",
        standard: "Dates, type of time, and coverage notes are in the request. A hallway ask is not submitted",
      },
      {
        step: "Log it the same day",
        owner: "Office manager",
        standard: "The request is visible to the manager before the two-day clock is half gone",
      },
      {
        step: "Check the policy and the calendar",
        owner: "Hiring manager",
        standard: "The decision uses the written policy and the coverage you already have. Adapt the policy check to your local requirements",
      },
      {
        step: "Approve or deny within two business days",
        owner: "Hiring manager",
        standard: "The employee has a yes or a no, with the dates, inside two business days",
      },
      {
        step: "Confirm coverage",
        owner: "Hiring manager",
        standard: "If approved, a named person covers the work before the time off starts",
      },
      {
        step: "Tell payroll or the timesheet owner",
        owner: "Office manager",
        standard: "Approved time is in the place payroll reads, before the timesheet closes",
      },
      {
        step: "File the decision",
        owner: "Office manager",
        standard: "The request and the decision stay with the employee record",
      },
    ],
    checklist: [
      "Request has dates and type",
      "Logged the day it arrived",
      "Checked against the written policy",
      "Coverage named if approved",
      "Employee told yes or no within two business days",
      "Payroll or the timesheet updated",
      "Decision filed",
    ],
    exceptions: [
      "The request arrives the day before: still log it, and say whether your policy allows that short a notice. Do not invent a new rule for one person.",
      "Two people ask for the same day and both cannot be out: decide from the written priority, and tell both of them.",
      "The manager is the person requesting time off: the backup approver named in the SOP decides.",
      "You do not have a written policy yet: do not pretend this procedure is the policy. Write the rule, then run the steps.",
    ],
    prefill: {
      businessType: "Small operating company",
      processName: "Time-off requests",
      role: "Office manager",
      tools: "Shared calendar, request form, employee file",
      kpi: "Approved or denied within 2 business days",
      trigger: "Employee submits a request",
    },
    related: [
      "employee-onboarding-sop-template",
      "payroll-sop-template",
      "virtual-assistant-sop-template",
    ],
    faqs: [
      {
        question: "What is the difference between an HR SOP and a handbook?",
        answer:
          "The handbook says the rule: how much time off exists and what kind. The SOP says the steps: where the request goes, who decides, and by when. Keep them separate so a policy change does not bury the procedure.",
      },
      {
        question: "Should a lawyer review this?",
        answer:
          "Have a qualified person review the policy that sits behind this SOP, especially anything about pay or leave. This page is the procedure for handling a request. Adapt it to your local requirements before you train managers on it.",
      },
      {
        question: "Which HR SOPs should I write first?",
        answer:
          "Time off, because it happens every month, then onboarding and offboarding, because those are the days access is created and removed. Hiring and check-ins come next. Payroll is its own template.",
      },
    ],
  }),
  template({
    path: "/sop-templates/payroll-sop-template",
    slug: "payroll-sop-template",
    keyword: "Payroll SOP Template",
    heading: "Payroll SOP Template",
    topicLabel: "payroll",
    description:
      "Free payroll SOP template for a biweekly run: timesheets, a two-person check, submit, and reconcile. Read it on the page, then draft yours with the AI Writer.",
    industry: "Finance",
    templateGroup: "function",
    mcTag: "tpl-payroll",
    lede:
      "Payroll is a calendar with a cutoff, not a hero task on Friday afternoon. This SOP runs a biweekly payroll from closed timesheets to a reconciled file.",
    purpose:
      "Approve payroll before the provider's cutoff so people are paid on time and two people have looked at the run.",
    scope:
      "A biweekly payroll run for a small business. It is provider-agnostic: put your provider's name in the tools when you draft it. Tax treatment and benefit rules belong with your provider and a qualified tax professional. Adapt this procedure to your local requirements.",
    roles: ["Payroll administrator (prepares)", "Owner or second approver (approves)", "Managers (timesheets)"],
    records:
      "Keep the closed timesheets, the exception list, both approvals, the provider confirmation, and the reconciliation note. Store them where both approvers can find last run.",
    reviewCadence:
      "Review when you change pay frequency, the provider, or who is allowed to approve. Read the last run's exceptions before you train a backup administrator.",
    customize: [
      "Your cutoff time, copied from the provider, including the time zone",
      "Who prepares and who approves. They should be two people",
      "What counts as an exception: a missed punch, a bonus, a termination",
      "Where the confirmation and the reconciliation are filed",
    ],
    sections: [
      {
        heading: "A run, not a software tour",
        body: [
          "The steps below work whether you use a bureau, an accountant, or software. Write the provider's name and the cutoff into your draft. The SOP stays the same shape if you switch providers: collect, review, approve with a second person, submit, reconcile, file.",
        ],
      },
    ],
    templateSteps: [
      {
        step: "Close timesheets",
        owner: "Managers",
        standard: "Timesheets are in before the deadline you published. Late punches are exceptions, not quiet edits",
      },
      {
        step: "Review hours and exceptions",
        owner: "Payroll administrator",
        standard: "Missed punches, bonuses, and terminations are on one list before anyone approves",
      },
      {
        step: "First review of the run",
        owner: "Payroll administrator",
        standard: "The draft totals match the timesheets and the exception list",
      },
      {
        step: "Second person approves",
        owner: "Owner",
        standard: "A different person from the preparer approves before submit. One person does not approve their own run",
      },
      {
        step: "Submit before the provider cutoff",
        owner: "Payroll administrator",
        standard: "The confirmation number or email is saved as soon as it exists",
      },
      {
        step: "Reconcile the confirmation to the approved run",
        owner: "Payroll administrator",
        standard: "What the provider accepted matches what the second person approved",
      },
      {
        step: "File the packet",
        owner: "Payroll administrator",
        standard: "Timesheets, exceptions, both approvals, and the confirmation are stored together",
      },
    ],
    checklist: [
      "Timesheet deadline announced",
      "Timesheets closed",
      "Exception list written",
      "Preparer review done",
      "Second person approved",
      "Submitted before the cutoff",
      "Confirmation saved",
      "Reconciliation filed",
    ],
    exceptions: [
      "You missed the cutoff: call the provider, ask what they can still run, and tell employees the same day if payday moves. Write down what you do differently next cycle.",
      "A timesheet is still open at the deadline: pay from the approved hours you have and put the rest on the exception list. Do not hold the whole company for one card.",
      "The second approver is unavailable: use the backup named in this SOP. Do not skip the second check.",
      "A termination lands mid-cycle: put it on the exception list and confirm the final pay treatment with your provider before you submit.",
    ],
    prefill: {
      businessType: "Small business",
      processName: "Biweekly payroll run",
      role: "Payroll administrator",
      tools: "Timesheets, payroll provider, approval note",
      kpi: "Payroll approved before the provider cutoff",
      trigger: "Timesheets close",
    },
    related: [
      "hr-sop-template",
      "employee-onboarding-sop-template",
      "virtual-assistant-sop-template",
    ],
    faqs: [
      {
        question: "Does this depend on a payroll provider?",
        answer:
          "No. Collect timesheets, review exceptions, get a second approval, submit, and reconcile. Put your provider's name and cutoff in the draft. If you change providers, you change those two lines, not the whole SOP.",
      },
      {
        question: "What do we do if we miss the cutoff?",
        answer:
          "Contact the provider and ask what can still be processed. Tell people the same day if payday changes. Then write the time you will close timesheets next cycle so the run is not a Friday scramble.",
      },
      {
        question: "Who should approve payroll?",
        answer:
          "Two people. The administrator prepares the run. A second person, usually the owner, approves it before it is submitted. The person who prepares it does not approve it alone.",
      },
    ],
  }),
];

const bySlug = new Map(
  TEMPLATES.map((entry) => [entry.slug as string, entry]),
);

export function getTemplate(slug: string): ContentEntry | undefined {
  return bySlug.get(slug);
}

export function relatedTemplates(entry: ContentEntry): ContentEntry[] {
  return (entry.related ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((item): item is ContentEntry => Boolean(item));
}

export function templatesByGroup(): {
  industry: ContentEntry[];
  function: ContentEntry[];
} {
  return {
    industry: TEMPLATES.filter((entry) => entry.templateGroup === "industry"),
    function: TEMPLATES.filter((entry) => entry.templateGroup === "function"),
  };
}
