import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function useEmigrants() {
  const [emigrants, setEmigrants] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "emigrants"), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmigrants(list);
    });

    return () => unsub();
  }, []);

  return emigrants;
}
