const navigateByRole = (role) => {
  switch (role) {
    case "sc_staff":
      return "/sc_staff";
    case "evm_staff":
      return "/evm";
    case "admin":
      return "/evm";
    case "sc_technician":
      return "/sc_technician/technician";
    default:
      break;
  }
};

export default navigateByRole;
