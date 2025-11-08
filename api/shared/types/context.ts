/**
 * User context types for request handling
 */

export interface UserContext {
  userId: string;
}

export type AppContext = {
  Variables: {
    user: UserContext;
  };
};
