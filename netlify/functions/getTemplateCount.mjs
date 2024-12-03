import { db, collection, getCountFromServer } from "./firebase/init.mjs"

export default async function getTemplateCount() {
    const templatesRef = collection(db, "templates")
    const snapshot = await getCountFromServer(templatesRef)
    const count = snapshot.data().count

    return new Response(count)
}