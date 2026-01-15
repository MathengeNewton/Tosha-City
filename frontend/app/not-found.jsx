import PageNotFound from "./components/NotFoundPage";
export const metadata = {
  title: "Page Not Found - PCEA Portal",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <>
      <PageNotFound />
    </>
  );
}
