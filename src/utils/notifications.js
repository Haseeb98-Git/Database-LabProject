// A simple notification utility to replace react-toastify

const toast = {
  success: (message) => {
    alert('Success: ' + message);
  },
  error: (message) => {
    alert('Error: ' + message);
  },
  info: (message) => {
    alert('Info: ' + message);
  },
  warning: (message) => {
    alert('Warning: ' + message);
  }
};

export { toast }; 