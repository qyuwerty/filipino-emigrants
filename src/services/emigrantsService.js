import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";

export const uploadCsvToFirestore = async (data, collectionName = "emigrants") => {
  if (!data || data.length === 0) return;

  const batch = writeBatch(db);
  let count = 0;

  data.forEach((row, index) => {
    const docRef = doc(collection(db, collectionName));
    batch.set(docRef, row);
    count++;
    // commit every 500 docs
    if (count % 500 === 0) batch.commit();
  });
  await batch.commit();
};
