import React from "react";

const Title = ({ title, subTitle }) => {
  return (
    <div className="space-y-1 mb-3">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="text-gray-500">{subTitle}</p>
    </div>
  );
};

export default Title;
