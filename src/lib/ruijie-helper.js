import rp from 'request-promise';

export const login = async ({ stuid, pswd }) => {
  if (!stuid || !pswd) {
    throw new Error('Stuid and Password are required');
  }

  const opts = {
    uri: `http://nvc.feit.me/rj?stuid=${stuid}&pswd=${pswd}`,
    json: true,
  };

  const loginResult = await rp(opts);
  return loginResult;
};
