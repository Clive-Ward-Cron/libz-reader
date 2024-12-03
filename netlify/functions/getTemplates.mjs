import { db, collection } from "./firebase/init.mjs"
export default async function getTemplates() {
    const templatesRef = collection(db, 'templates');
    const templateSnapShot = await getDocs(templatesRef);
    const templateList = templateSnapShot.docs.map(doc => doc.data())
    return new Response(JSON.stringify(templateList));
}