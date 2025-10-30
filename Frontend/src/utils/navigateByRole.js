const navigateByRole = (role) => {
  console.log(role);
  
  switch (role) {
    case "sc_staff":
      return "/sc_staff";
    
    case "evm_staff":
      return "/evm";
    default:
      break;
  }
};

export default navigateByRole;
