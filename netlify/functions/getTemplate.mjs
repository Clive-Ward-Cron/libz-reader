import { db, collection, getDocs, getCountFromServer, query, where, limit } from "./firebase/init.mjs"

export default async function getTemplate(request) {
    const data = await request.json()
    const templatesRef = collection(db, "templates")
    const q = query(templatesRef, where("id", "==", data.id), limit(1))
    const querySnapshot = await getDocs(q)
    const template = querySnapshot.docs.map(doc => doc.data())[0]
    
    return new Response(JSON.stringify(template))
}

export const config = {
    // path: "/api/getTemplate" //! Can't use this until Netilfy fixes their CLI
}