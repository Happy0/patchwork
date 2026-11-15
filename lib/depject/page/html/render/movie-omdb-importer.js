const {
  Array: MutantArray,
  h,
  when,
  map,
  Value,
  computed,
} = require("mutant");
const nest = require("depnest");
const preferences = require("../../../../preferences.js");
const blobFiles = require("ssb-blob-files");

exports.needs = nest({
  "app.navigate": "first",
  "feed.html.rollup": "first",
  "sbot.obs.connection": "first",
  "sbot.pull.resumeStream": "first",
  "sbot.pull.stream": "first",
  "sbot.async.publish": "first",
  "intl.sync.i18n": "first",
  "blob.sync.url": "first",
});

exports.gives = nest("page.html.render");

exports.create = function (api) {
  const i18n = api.intl.sync.i18n;
  return nest("page.html.render", function channel(path) {
    if (!path.startsWith("/movie-omdb-import")) return;

    console.log("entered omdb movie display page...");
    const params = new URLSearchParams(path.split("?")[1]);

    const loading = Value(false);
    const searchSpinner = Value(false);
    const status = Value(false);
    const currentMovie = Value(false);
    const imdbID = params.get("id");

    const fetchMovieDetails = async (_ev) => {
      searchSpinner.set(true);
      loading.set(true);
      const apiKey = preferences.get("omdbApiKey", "");
      const url = `http://www.omdbapi.com/?i=${
        encodeURIComponent(imdbID)
      }&apikey=${apiKey}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          alert("Couldn't find the movie using OMDB API. Sorry.");
          console.error(`Response status: ${response.status}`);
          status.set(results.Error);
          searchSpinner.set(false);
          loading.set(false);
          return;
        }

        const results = await response.json();
        console.log("movie metadata from omdb", results);

        searchSpinner.set(false);
        loading.set(false);
        currentMovie.set(results);
      } catch (error) {
        console.log(error);
        console.error(error.message);
      }
      return true;
    };

    fetchMovieDetails();

    function isObject(value) {
      return value && typeof value === "object";
    }

    function FocusHook() {
      return function (element) {
        setTimeout(() => {
          element.focus();
          element.select();
        }, 5);
      };
    }

    function ValueHook(obs) {
      return function (element) {
        element.value = obs();
        element.oninput = function () {
          obs.set(element.value.trim());
        };
      };
    }

    const attachFiles = (files) => {
      blobFiles(files, api.sbot.obs.connection, {
        stripExif: true,
        isPrivate: false,
      }, afterAttach);
    };

    const showDialog = (opts) => {
      const remote = require("@electron/remote");

      remote.dialog.showMessageBox(
        remote.getCurrentWindow(),
        opts,
      );
    };

    const importMovie = (movie) => {
      const newMovieData = {
        type: "movieclub/new",
        title: movie.Title,
        director: movie.Director.split(",").map((i) => i.trim()),
        actors: movie.Actors.split(",").map((i) => i.trim()),
        writer: movie.Writer.split(",").map((i) => i.trim()),
        year: movie.Year,
        releaseDate: movie.Released,
        imdbID: movie.imdbID,
        plot: movie.Plot,
        awards: movie.Awards ?? "",
        genre: movie.Genre.split(",").map((i) => i.trim()),
      };

      for (const k of ["genre", "awards"]) {
        if (typeof newMovieData[k] === "undefined") {
          newMovieData[k] = [];
        }
      }

      fetch(movie.Poster).then((data) => {
        return data.blob();
      }).then((bits) => {
        const posterFile = new File([bits], "poster.jpg", {
          type: bits.type,
        });

        const files = [posterFile];

        blobFiles(files, api.sbot.obs.connection, {
          stripExif: true,
          isPrivate: false,
        }, (err, file) => {
          // got a poster blob!
          newMovieData.poster = file;
          console.log(newMovieData);

          api.sbot.async.publish(newMovieData, function (err, msg) {
            console.log(msg);
            console.log(err);
            if (err) {
              showDialog({
                type: "error",
                title: i18n("Error"),
                buttons: ["OK"],
                message: i18n(
                  "An error occurred while attempting to import movie.",
                ),
                detail: err.message,
              });
            } else {
              api.app.navigate(msg.key);
            }
          });
        });
      });
    };

    const prepend = [
      h("PageHeading", [
        h("h1", [h("strong", i18n("Import Movie"))]),
        h("p", `Movie metadata from OMDB API.`),
      ]),
    ];

    const movieDetails = computed([currentMovie], (movie) => {
      return h("MovieDetails", [
        h("h1", movie.Title),
        h("img", { src: movie.Poster }),
        h("h3", movie.Year),
        h("hr"),
        h("blockquote", movie.Plot),
        h("hr"),
        h("ul", [
          h("li", `Genre: ${movie.Genre}`),
          h("li", `Director: ${movie.Director}`),
          h("li", `Writer: ${movie.Writer}`),
          h("li", `Actors: ${movie.Actors}`),
          h("li", `Awards: ${movie.Awards}`),
        ]),
        h("button", {
          "ev-click": () => {
            importMovie(movie);
          },
        }, "Import Movie"),
        h("br"),
        h("br"),
      ]);
    });

    return h("Scroller", { style: { overflow: "auto" } }, [
      h("div.wrapper", [
        h("section.prepend", prepend),
        h("br"),
        h("hr"),
        h("br"),
        h(
          "section.content",
          [
            /*
          == DETAIL ===========================================================================================================
          */
            when(
              currentMovie,
              movieDetails,
            ),
          ],
        ),
        when(status, h("h1", status)),
        when(
          loading,
          searchSpinner ? h("Loading -large -search") : h("Loading -large"),
        ),
      ]),
    ]);
  });
};
