import { LIMITS } from "@/config/limits";

export interface Faq {
  question: string;
  answer: string;
}

export interface ToolContent {
  /** Where the file is processed; drives the privacy note on the page. */
  processing: "browser" | "server";
  /** <title> text (the site name is appended by the title template). */
  metaTitle: string;
  metaDescription: string;
  /** Short, numbered how-to shown on the page. */
  steps: string[];
  faqs: Faq[];
}

const maxFiles = LIMITS.maxFilesPerJob;
const maxMb = Math.round(LIMITS.maxFileSizeBytes / (1024 * 1024));

export const toolContent: Record<string, ToolContent> = {
  "merge-pdf": {
    processing: "browser",
    metaTitle: "Merge PDF files online, free",
    metaDescription:
      "Combine multiple PDF files into one document in seconds. Reorder files, no sign-up, and your files never leave your browser.",
    steps: [
      "Select or drop the PDF files you want to combine.",
      "Use the arrows to put them in the order you want.",
      "Click Merge PDF and download the combined file.",
    ],
    faqs: [
      {
        question: "Are my files uploaded when I merge PDFs?",
        answer:
          "No. Merging runs entirely in your browser, so your documents never leave your device.",
      },
      {
        question: "How many PDFs can I merge at once?",
        answer: `You can merge up to ${maxFiles} files at a time, each up to ${maxMb} MB.`,
      },
      {
        question: "Can I change the order of the files?",
        answer:
          "Yes. Use the up and down arrows next to each file. The merged PDF follows the order shown in the list.",
      },
      {
        question: "Can I merge a password-protected PDF?",
        answer:
          "Not directly. Remove the password first with the Unlock PDF tool, then merge the unlocked copy.",
      },
    ],
  },

  "split-pdf": {
    processing: "browser",
    metaTitle: "Split PDF: extract pages or divide a PDF, free",
    metaDescription:
      "Extract specific pages, split every page, or cut a PDF into fixed-size parts. Free, no sign-up, and processed in your browser.",
    steps: [
      "Select the PDF you want to split.",
      "Choose a mode: extract page ranges, split every page, or fixed-size parts.",
      "Click Split PDF and download the result.",
    ],
    faqs: [
      {
        question: "How do I extract specific pages?",
        answer:
          "Use the Extract pages tab and type the pages you want, for example 1-3, 5, 8-10. They are combined into one PDF in the order you list them.",
      },
      {
        question: "What do I get when I split into several files?",
        answer:
          "Every page and fixed-size modes produce several PDFs, which are delivered together as a single ZIP file.",
      },
      {
        question: "Is my PDF uploaded anywhere?",
        answer: "No. Splitting happens in your browser, so the file stays on your device.",
      },
      {
        question: "Why does it say my page range is invalid?",
        answer:
          "Ranges must use page numbers that exist in the document, start at 1, and go from low to high (for example 3-5, not 5-3). The error message tells you which part to fix.",
      },
    ],
  },

  "rotate-pdf": {
    processing: "browser",
    metaTitle: "Rotate PDF pages online, free",
    metaDescription:
      "Rotate individual PDF pages or the whole document left or right and save it permanently. Free and private: processed in your browser.",
    steps: [
      "Select your PDF and wait for the page thumbnails.",
      "Rotate single pages, or use All left and All right.",
      "Click Apply rotation and download the PDF.",
    ],
    faqs: [
      {
        question: "Can I rotate only some pages?",
        answer:
          "Yes. Each page has its own left and right buttons, and you can also rotate all pages at once.",
      },
      {
        question: "Is the rotation saved in the file?",
        answer:
          "Yes. The downloaded PDF stores the new orientation, so it opens rotated in any PDF viewer.",
      },
      {
        question: "Does rotating reduce quality?",
        answer:
          "No. Only the page orientation changes. Text, images and other content are left untouched.",
      },
      {
        question: "Is my file uploaded?",
        answer: "No. Everything runs in your browser.",
      },
    ],
  },

  "delete-pages": {
    processing: "browser",
    metaTitle: "Delete pages from a PDF online, free",
    metaDescription:
      "Remove unwanted pages from a PDF. Click pages to select them, then download the cleaned file. Free and processed in your browser.",
    steps: [
      "Select your PDF and wait for the page thumbnails.",
      "Click each page you want to remove; selected pages are dimmed.",
      "Click Delete pages and download the new PDF.",
    ],
    faqs: [
      {
        question: "Does this change my original file?",
        answer:
          "No. You get a new PDF with the selected pages removed. Your original file is not modified.",
      },
      {
        question: "Can I delete every page?",
        answer: "No. At least one page must remain, because a PDF can't be empty.",
      },
      {
        question: "Can I undo a selection before saving?",
        answer:
          "Yes. Click a selected page again to unselect it, or use Clear selection to start over.",
      },
      {
        question: "Is my file uploaded?",
        answer: "No. Pages are removed in your browser and the file never leaves your device.",
      },
    ],
  },

  "reorder-pages": {
    processing: "browser",
    metaTitle: "Reorder PDF pages online, free",
    metaDescription:
      "Rearrange PDF pages by dragging thumbnails into a new order. Free, no sign-up, and processed privately in your browser.",
    steps: [
      "Select your PDF and wait for the page thumbnails.",
      "Drag pages into the order you want, or use the arrow buttons.",
      "Click Save new order and download the PDF.",
    ],
    faqs: [
      {
        question: "How do I move a page?",
        answer:
          "Drag a thumbnail onto another position. You can also use the left and right arrows under each page, which works with a keyboard and on touch screens.",
      },
      {
        question: "How do I know which page is which?",
        answer:
          "The number under each thumbnail is the page's original page number, so you can always see what moved.",
      },
      {
        question: "Can I reset my changes?",
        answer: "Yes. Use Reset order to go back to the original sequence.",
      },
      {
        question: "Is my file uploaded?",
        answer: "No. Reordering happens in your browser.",
      },
    ],
  },

  "edit-pdf": {
    processing: "browser",
    metaTitle: "Edit PDF online: change text, add images & shapes",
    metaDescription:
      "Change existing text in a PDF, or add new text, images, highlights and shapes. Free, and runs privately in your browser.",
    steps: [
      "Select the PDF you want to edit.",
      "Click existing text to change it, or add new text, an image or a shape and drag it into place.",
      "Click Save PDF and download the edited file.",
    ],
    faqs: [
      {
        question: "Can I change the text that's already in my PDF?",
        answer:
          "Yes. Click a line of text and type the new wording. The original text is removed from the file and the new text is written in its place, so it can't be selected or extracted from the saved copy.",
      },
      {
        question: "Will changed text keep the original font?",
        answer:
          "No. Replacement text uses Helvetica, because the original font is usually embedded as a partial subset that can't draw arbitrary new letters. Size and colour are matched to the original.",
      },
      {
        question: "Why can't I click any text on my page?",
        answer:
          "Scanned documents and images of text have no real text to edit. You can still add new text, images and shapes on top of them.",
      },
      {
        question: "Does covering text with a white box remove it?",
        answer:
          "No. A shape only hides content visually; the text underneath is still in the file. To really remove text, click it and use Remove line, which deletes it from the page.",
      },
      {
        question: "Can I add my signature?",
        answer:
          "Yes. Add an image of your signature (a PNG with a transparent background works best), then drag and resize it into place.",
      },
      {
        question: "Is my file uploaded?",
        answer:
          "No. Editing happens entirely in your browser. The first use downloads the editor engine, about 4 MB, and your file never leaves your device.",
      },
    ],
  },

  "image-to-pdf": {
    processing: "browser",
    metaTitle: "Convert JPG and PNG images to PDF, free",
    metaDescription:
      "Turn JPG and PNG images into a single PDF. Choose A4, Letter or fit-to-image pages and set margins. Free and processed in your browser.",
    steps: [
      "Select or drop your JPG or PNG images.",
      "Arrange the order and choose a page size and margin.",
      "Click Convert to PDF and download the file.",
    ],
    faqs: [
      {
        question: "Which image formats are supported?",
        answer: "JPG (JPEG) and PNG images are supported.",
      },
      {
        question: "Will photos from my phone appear sideways?",
        answer:
          "No. The orientation stored in the photo is applied automatically, so portrait photos stay upright.",
      },
      {
        question: "What page sizes can I choose?",
        answer:
          "A4, US Letter, or Fit to image, which makes each page the size of its image. For A4 and Letter, the page turns landscape for wide images.",
      },
      {
        question: "Are my images uploaded?",
        answer: "No. The conversion runs in your browser and your images stay on your device.",
      },
    ],
  },

  "compress-pdf": {
    processing: "server",
    metaTitle: "Compress PDF online, reduce file size free",
    metaDescription:
      "Reduce PDF file size while keeping text sharp and selectable. Three compression levels, no sign-up. Files are deleted right after processing.",
    steps: [
      "Select the PDF you want to make smaller.",
      "Pick a compression level: less, recommended, or extreme.",
      "Click Compress PDF and download the smaller file.",
    ],
    faqs: [
      {
        question: "Is my file uploaded?",
        answer:
          "Yes. Compression runs on our server, which processes your file and deletes it immediately afterwards. We don't keep copies.",
      },
      {
        question: "Will text stay selectable?",
        answer:
          "Yes. Compression mainly reduces the size of images inside the PDF. Text and vector graphics are kept.",
      },
      {
        question: "Why didn't my file get smaller?",
        answer:
          "Some PDFs are already optimized or contain little image data. If we can't make the file smaller, you get the original back unchanged, with a note explaining why.",
      },
      {
        question: "What's the difference between the levels?",
        answer:
          "Less compression keeps the highest quality, Recommended balances quality and size, and Extreme gives the smallest file with lower image quality.",
      },
      {
        question: "Is there a size limit?",
        answer: `Files can be up to ${maxMb} MB.`,
      },
    ],
  },

  "protect-pdf": {
    processing: "server",
    metaTitle: "Password protect a PDF online, free",
    metaDescription:
      "Encrypt a PDF with a password using AES-256 so only people with the password can open it. Free; files are deleted right after processing.",
    steps: [
      "Select the PDF you want to protect.",
      "Enter a password and confirm it.",
      "Click Protect PDF and download the encrypted file.",
    ],
    faqs: [
      {
        question: "How strong is the encryption?",
        answer:
          "Files are encrypted with AES-256, the strongest encryption supported by the PDF standard. How secure the file is depends mostly on how strong your password is.",
      },
      {
        question: "Can you recover my password if I forget it?",
        answer:
          "No. We never store your password, so a forgotten password cannot be recovered. Keep it somewhere safe.",
      },
      {
        question: "Is my file uploaded?",
        answer:
          "Yes. Encryption runs on our server, which processes your file and deletes it immediately afterwards.",
      },
      {
        question: "Which PDF viewers can open the protected file?",
        answer:
          "Any modern PDF viewer, including browsers, Adobe Acrobat and system viewers, will ask for the password.",
      },
    ],
  },

  "unlock-pdf": {
    processing: "server",
    metaTitle: "Unlock a PDF: remove its password, free",
    metaDescription:
      "Remove the password from a PDF you own by entering the password once. Free; files are deleted right after processing.",
    steps: [
      "Select the password-protected PDF.",
      "Enter its password.",
      "Click Unlock PDF and download the unprotected copy.",
    ],
    faqs: [
      {
        question: "Can this unlock a PDF if I don't know the password?",
        answer:
          "No. You need the correct password. This tool removes protection from files you can already open; it does not crack or bypass passwords.",
      },
      {
        question: "What happens to the original file?",
        answer:
          "Nothing. You receive a new, unprotected copy and your original stays protected.",
      },
      {
        question: "Is my file or password stored?",
        answer:
          "No. The file is processed on our server and deleted immediately afterwards, and the password is never stored.",
      },
      {
        question: "What if it says the password is incorrect?",
        answer:
          "Passwords are case-sensitive. Re-check capital letters, spaces and special characters, then try again.",
      },
    ],
  },
};

export function getToolContent(slug: string): ToolContent | undefined {
  return toolContent[slug];
}
