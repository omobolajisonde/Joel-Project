exports.isPasswordValid = (password) => {
  const uppercaseRegex = /[A-Z]/;
  const symbolRegex = /[!@#$%^&*()_+{}[\]:;<>,.?~\\-]/;
  const letterRegex = /[a-zA-Z]/;
  const numberRegex = /[0-9]/;

  return (
    uppercaseRegex.test(password) &&
    symbolRegex.test(password) &&
    letterRegex.test(password) &&
    numberRegex.test(password)
  );
};
