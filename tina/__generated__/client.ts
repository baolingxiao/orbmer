import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ cacheDir: '/Users/dai/Documents/3D打印独立站/tina/__generated__/.cache/1785108733551', url: 'http://localhost:4001/graphql', token: '', queries,  });
export default client;
  