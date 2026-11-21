import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "20s", target: 50 },
    { duration: "10s", target: 0 },
  ],
};

export default function () {
  const response = http.get("http://localhost:4000/api/health");
  check(response, { "health returns 200": (res) => res.status === 200 });
  sleep(1);
}
