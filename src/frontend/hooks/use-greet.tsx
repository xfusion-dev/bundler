import { useMutation } from "@tanstack/react-query";
import { backend } from "../../backend/declarations";

export default function useGreet(onSuccess: (data: string) => void) {
  return useMutation({
    mutationFn: (name: string) => {
      return backend.greet(name);
    },
    onSuccess,
  });
}
